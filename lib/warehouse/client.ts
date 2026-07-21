import { Pool, type QueryResultRow } from "pg";
import { pgPoolConfig } from "../db/config";
import { getWarehouseCreds, vaultConfigured } from "../vault/creds";

// A pooled connection to the account-activity warehouse, anchored to the Vault lease that
// authenticated it.
//
// The obvious implementation, a module-scoped pool built once, is wrong here. Under Fluid Compute an
// instance is reused across concurrent invocations and outlives any single lease, so a pool built
// once keeps using a credential Vault has already expired, and the first read after that fails. The
// pool has to know when its own credential dies and replace itself before it does.

type Leased = {
  pool: Pool;
  username: string;
  leaseId: string | null;
  // Refresh from here, off the request path.
  rotateAfter: number;
  // Past here the remaining margin is too thin to gamble a request on, so rotate synchronously.
  hardAfter: number;
};

let current: Leased | undefined;

// Single flight. Without it a cold-start burst has every concurrent invocation mint its own lease
// and build its own Pool: all but the last are overwritten, never ended, and their leases left
// orphaned in Postgres for a full TTL. Classic one-request-per-instance serverless never shows this,
// which is exactly why it is easy to ship.
let pending: Promise<Leased> | undefined;

// pg emits `error` on the Pool when an idle backend dies underneath it. That is not an exotic case
// here: it is the normal consequence of Vault's revocation statement running pg_terminate_backend,
// and of RDS failing over. An unhandled EventEmitter `error` is an uncaught exception that takes the
// instance down, so this handler is load-bearing rather than defensive.
function watched(pool: Pool): Pool {
  pool.on("error", () => {
    if (current?.pool === pool) current.hardAfter = 0;
  });
  return pool;
}

async function build(): Promise<Leased> {
  if (!vaultConfigured()) {
    const url = process.env.WAREHOUSE_DATABASE_URL;
    if (!url) throw new Error("WAREHOUSE_DATABASE_URL is not set");
    // The standing credential, deliberately still reachable. Unsetting VAULT_ADDR is the rollback,
    // and a rollback that needs a code change is not a rollback.
    return {
      pool: watched(new Pool(pgPoolConfig(url))),
      username: "standing",
      leaseId: null,
      rotateAfter: Number.POSITIVE_INFINITY,
      hardAfter: Number.POSITIVE_INFINITY,
    };
  }

  const host = process.env.VAULT_WAREHOUSE_HOST;
  if (!host) throw new Error("VAULT_WAREHOUSE_HOST is not set");
  const db = process.env.VAULT_WAREHOUSE_DB ?? "warehouse";

  const creds = await getWarehouseCreds();
  const dsn = `postgresql://${creds.username}:${encodeURIComponent(creds.password)}@${host}:5432/${db}`;
  const ttlMs = creds.ttlSeconds * 1000;
  const now = Date.now();

  return {
    pool: watched(new Pool(pgPoolConfig(dsn))),
    username: creds.username,
    leaseId: creds.leaseId,
    rotateAfter: now + ttlMs * 0.8,
    hardAfter: now + ttlMs * 0.95,
  };
}

function rotate(): Promise<Leased> {
  pending ??= build()
    .then((next) => {
      const previous = current;
      current = next;
      if (previous && previous.pool !== next.pool) {
        // Drain rather than sever. end() resolves once checked-out clients are released, so queries
        // already in flight finish under a credential that is still valid.
        void previous.pool.end().catch(() => {});
      }
      return next;
    })
    .finally(() => {
      pending = undefined;
    });
  return pending;
}

// Reading a warehouse credential is a dynamic act by definition: the answer depends on when you
// ask, because the lease expires. Cache Components enforces that honestly, and rejects Date.now()
// in a render it still believes is prerenderable.
//
// This matters here and not before because the pool is now clock-aware. A build prerenders several
// routes in one process, so a route rendered after the pool is warm reaches the deadline check
// before doing any I/O that would have marked the render dynamic on its own.
//
// The import is dynamic and the failure is swallowed on purpose: this same code path runs inside eve
// tools and in scripts, neither of which has a Next render to declare anything about.
async function declareDynamic(): Promise<void> {
  try {
    const { connection } = await import("next/server");
    await connection();
  } catch {
    // Not inside a Next render. Nothing to declare, and nothing has gone wrong.
  }
}

export async function getWarehousePool(): Promise<Pool> {
  await declareDynamic();

  const live = current;
  if (!live) return (await rotate()).pool;

  const now = Date.now();
  if (now >= live.hardAfter) return (await rotate()).pool;

  if (now >= live.rotateAfter && !pending) {
    // Refresh ahead without blocking this request. Not using waitUntil on purpose: that would mean
    // a new dependency plus an assumption that request context reaches every scope this runs in. If
    // the instance suspends before this settles, nothing breaks. The next request finds an unrotated
    // pool and either tries again or, past hardAfter, rotates synchronously. The background attempt
    // is an optimisation; the deadline above is the correctness guarantee.
    void rotate().catch(() => {});
  }

  return live.pool;
}

// One home for the retry. A lease can be revoked before its TTL, which the 80 percent clock cannot
// anticipate, so an authentication failure invalidates the pool and retries exactly once rather than
// surfacing a 500. Once, not in a loop: if a freshly minted credential also fails to authenticate
// then the problem is configuration, and retrying harder only makes it slower to find.
export async function warehouseQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
) {
  try {
    return await (await getWarehousePool()).query<T>(text, values);
  } catch (error) {
    // 28P01 invalid_password, 28000 invalid_authorization_specification.
    const code = (error as { code?: string }).code;
    if (code !== "28P01" && code !== "28000") throw error;
    if (current) current.hardAfter = 0;
    return await (await getWarehousePool()).query<T>(text, values);
  }
}

// Which identity is reading right now. Exposed so a health endpoint can name the leased role that
// actually touched the data, rather than minting a second lease in order to describe the first.
export function warehouseIdentity() {
  const live = current;
  if (!live) {
    return {
      mode: vaultConfigured() ? "vault" : "standing",
      username: null,
      leaseId: null,
      secondsRemaining: null,
    };
  }
  return {
    mode: live.leaseId ? "vault" : "standing",
    username: live.username,
    leaseId: live.leaseId,
    secondsRemaining: Number.isFinite(live.hardAfter)
      ? Math.max(0, Math.round((live.hardAfter - Date.now()) / 1000))
      : null,
  };
}
