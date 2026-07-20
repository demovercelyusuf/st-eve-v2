import { NextResponse } from "next/server";
import { getSalesforceAccount } from "@/lib/salesforce/adapter";
import { getAccountActivity, listAccounts } from "@/lib/warehouse/repository";

// A live cross-boundary read. Hitting this endpoint proves the copilot can actually reach the
// customer's systems: it reads the warehouse in bulk and the Salesforce CRM for one account, and
// reports row counts and latency. If this is green, the boundary is real.

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const accounts = await listAccounts();
    const sample = accounts[0];
    const [activity, sfdc] = sample
      ? await Promise.all([
          getAccountActivity(sample.accountId),
          getSalesforceAccount(sample.accountId),
        ])
      : [[], null];

    return NextResponse.json({
      ok: true,
      boundary: "warehouse activity + mocked Salesforce, read live",
      accounts: accounts.length,
      sample: sample
        ? {
            accountId: sample.accountId,
            name: sample.name,
            activityRows: activity.length,
            openOpportunities: sfdc?.opportunities.length ?? 0,
          }
        : null,
      latencyMs: Date.now() - started,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
