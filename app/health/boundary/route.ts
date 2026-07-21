import { NextResponse } from "next/server";
import { getLatestBrief } from "@/lib/appstore/briefs";
import { getSalesforceAccount } from "@/lib/salesforce/adapter";
import { getAccountActivity, listAccounts } from "@/lib/warehouse/repository";

// A live cross-boundary read. Hitting this endpoint proves the copilot can actually reach the
// customer's systems: it reads the warehouse in bulk and the CRM for one account, and reports row
// counts and latency.
//
// It also reports the app-store, which is a different database on a different provider and the one
// piece of state Vercel actually holds. That was missing, and the omission cost real time: the
// account page degrades gracefully when the app-store is unreachable, printing "the run store could
// not be read", and with no health signal there was nothing to distinguish "no brief has been run
// for this account" from "that database is down". Each half is reported separately so a failure
// names itself.

// Drizzle wraps a driver error in its own, and the wrapper says only "Failed query" plus the SQL,
// which is the half you already knew. The reason a connection failed lives one or two levels down
// the cause chain, so this walks it.
function why(reason: unknown): { error: string; cause?: string; code?: string } {
  const top = reason instanceof Error ? reason : new Error(String(reason));
  let cursor: unknown = top.cause;
  for (let depth = 0; depth < 4 && cursor instanceof Error; depth += 1) {
    const code = (cursor as { code?: string }).code;
    if (cursor.cause === undefined) {
      return { error: top.message, cause: cursor.message, ...(code ? { code } : {}) };
    }
    cursor = cursor.cause;
  }
  return { error: top.message };
}

export async function GET() {
  const started = Date.now();

  // Settled, not awaited together. The whole point is to report which half is broken, so one side
  // failing must not take the other's result with it.
  const [customer, derived] = await Promise.allSettled([
    (async () => {
      const accounts = await listAccounts();
      const sample = accounts[0];
      const [activity, sfdc] = sample
        ? await Promise.all([
            getAccountActivity(sample.accountId),
            getSalesforceAccount(sample.accountId),
          ])
        : [[], null];
      return {
        accounts: accounts.length,
        sample: sample
          ? {
              accountId: sample.accountId,
              name: sample.name,
              activityRows: activity.length,
              openOpportunities: sfdc?.opportunities.length ?? 0,
            }
          : null,
      };
    })(),
    (async () => {
      const at = Date.now();
      // A null result is a valid answer: it means no brief has been recorded for that account.
      // Reaching the database at all is what this is checking.
      const brief = await getLatestBrief("ACC-2041");
      return { reachable: true as const, hasBrief: brief !== null, latencyMs: Date.now() - at };
    })(),
  ]);

  const body = {
    ok: customer.status === "fulfilled",
    boundary: "warehouse activity + mocked Salesforce, read live",
    ...(customer.status === "fulfilled"
      ? customer.value
      : { error: customer.reason instanceof Error ? customer.reason.message : String(customer.reason) }),
    appStore: derived.status === "fulfilled" ? derived.value : { reachable: false as const, ...why(derived.reason) },
    latencyMs: Date.now() - started,
  };

  return NextResponse.json(body, { status: customer.status === "fulfilled" ? 200 : 500 });
}
