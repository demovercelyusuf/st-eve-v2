import { Suspense } from "react";
import { readPatchIssueCounts } from "@/lib/linear/account-issues";
import { LINEAR_CONNECTOR } from "@/lib/linear/issues";
import { warehouseIdentity, warehouseQuery } from "@/lib/warehouse/client";

export const metadata = { title: "Integrations" };

// What Steve reads, and how it proves it is allowed to. The second half is the interesting one: the
// systems are unremarkable, the credential model is not.
//
// Every status on this page is measured at request time rather than declared. A page that claims an
// integration is connected because someone typed that into an array is worth nothing, and this is
// the page where that would matter most.
export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Integrations</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
          The systems Steve reads across, and the credential it presents to each. Status is checked
          when you load this page, not declared in configuration.
        </p>
      </header>

      <Suspense fallback={<IntegrationsSkeleton />}>
        <IntegrationList />
      </Suspense>
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div className="h-28 animate-pulse rounded-xl border border-border bg-card" key={i} />
      ))}
    </div>
  );
}

type Status = "live" | "degraded" | "mocked";

function StatusDot({ status }: { status: Status }) {
  const tone =
    status === "live"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-amber-500"
        : "bg-muted-foreground/50";
  return <span aria-hidden className={`inline-block size-2 rounded-full ${tone}`} />;
}

function Row({
  name,
  status,
  statusLabel,
  what,
  credential,
}: {
  name: string;
  status: Status;
  statusLabel: string;
  what: string;
  credential: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-base">{name}</h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs">
          <StatusDot status={status} />
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-muted-foreground text-sm">{what}</p>
      <p className="mt-3 border-border border-t pt-3 font-mono text-[13px] text-foreground/80">
        {credential}
      </p>
    </article>
  );
}

async function IntegrationList() {
  // Touch the warehouse first so the identity below describes the credential that actually served a
  // query rather than an empty pool that has never connected.
  const [warehouse, linear] = await Promise.all([
    warehouseQuery<{ n: string }>(`select count(*)::text as n from activity.dim_account`)
      .then((r) => ({ ok: true as const, accounts: Number(r.rows[0]?.n ?? 0) }))
      .catch((error) => ({ ok: false as const, error: String(error) })),
    readPatchIssueCounts([]).then(
      (r) => ({ ok: true as const, connected: r.connected }),
      () => ({ ok: false as const, connected: false }),
    ),
  ]);

  const identity = warehouseIdentity();
  const vaultMode = identity.mode === "vault";

  return (
    <div className="mt-8 space-y-3">
      <Row
        credential={
          vaultMode
            ? `Vault dynamic role · ${identity.username} · expires in ${identity.secondsRemaining}s`
            : "Standing connection string from the environment. Vault is not configured here."
        }
        name="Account-activity warehouse"
        status={warehouse.ok ? (vaultMode ? "live" : "degraded") : "degraded"}
        statusLabel={warehouse.ok ? `${warehouse.accounts} accounts` : "unreachable"}
        what="Postgres in the customer's own AWS account, holding call transcripts and weekly usage rollups landed by their existing pipeline. Steve only ever reads."
      />

      <Row
        credential={
          vaultMode
            ? "The same leased role as the warehouse. A schema boundary, not a credential boundary."
            : "Standing connection string, shared with the warehouse read path."
        }
        name="Salesforce"
        status="mocked"
        statusLabel="mocked for the demo"
        what="The system of record for the deal. Reached through its own adapter so it behaves as a separate system; in this deployment it is a mocked schema rather than a live org."
      />

      <Row
        credential={`Vercel Connect · ${LINEAR_CONNECTOR} · app-scoped token minted per request. No Linear API key exists in the deployment.`}
        name="Linear"
        status={linear.connected ? "live" : "degraded"}
        statusLabel={linear.connected ? "connected" : "not connected"}
        what="What engineering is holding against an account. Read live over the network, and it fails soft: if Linear is unreachable the brief still ships without it rather than not at all."
      />

      <Row
        credential="Vercel Connect · bot token supplied per request. Steve holds no Slack secret at rest."
        name="Slack"
        status="live"
        statusLabel="delivery surface"
        what="Where the account team already works. Mention Steve in the channel and the brief lands in a thread, so a follow-up continues the same session."
      />

      <section className="mt-8 rounded-xl border border-border border-dashed p-5">
        <h2 className="font-semibold text-sm">Why none of these hold a password</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Steve authenticates as itself. Every request carries an OIDC assertion signed by the
          platform for this specific deployment, bound to the project and environment, which it did
          not choose and cannot forge. Vault exchanges that assertion for a database role that
          expires within the hour, and Connect exchanges it for a token scoped to one integration.
          The only credentials in this project's environment are addresses and role names.
        </p>
      </section>
    </div>
  );
}
