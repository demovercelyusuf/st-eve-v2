import { NextResponse } from "next/server";
import { warehouseIdentity, warehouseQuery } from "@/lib/warehouse/client";

// Which credential is reading the warehouse right now, and whether it actually works.
//
// This answers the question the architecture claims to answer, in a form somebody can check rather
// than take on trust: it names the leased Postgres role that served the read, how long that lease
// has left, and the row count it returned. `mode` is the honest part. If it says "standing" then
// VAULT_ADDR is unset and the app is on the fallback connection string, which is a real state this
// deployment can be in and is the rollback path.
//
// It reports identity rather than minting anything, so hitting it does not itself create a lease.

export async function GET() {
  const started = Date.now();
  try {
    // Runs first so the pool exists and the identity below describes the credential that actually
    // served a query, rather than an empty pool that has never connected.
    const { rows } = await warehouseQuery<{ n: string }>(
      `select count(*)::text as n from activity.dim_account`,
    );

    return NextResponse.json({
      ok: true,
      ...warehouseIdentity(),
      accountsRead: Number(rows[0]?.n ?? 0),
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    // Surface the failure rather than a generic 500. A brief that fails because Vault is
    // unreachable and one that fails because the query is wrong are different problems, and the
    // difference should not require reading logs.
    return NextResponse.json(
      {
        ok: false,
        ...warehouseIdentity(),
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
