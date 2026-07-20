import { desc, eq } from "drizzle-orm";
import { appStore, schema } from "./client";

// The most recent brief run recorded for an account: when it ran and what the grounding gate did.
// The brief's full text lives in its durable session; this is the run record the account page shows.
export async function getLatestBriefRun(accountId: string) {
  const db = appStore();
  const [run] = await db
    .select()
    .from(schema.briefRuns)
    .where(eq(schema.briefRuns.accountId, accountId))
    .orderBy(desc(schema.briefRuns.createdAt))
    .limit(1);
  return run ?? null;
}
