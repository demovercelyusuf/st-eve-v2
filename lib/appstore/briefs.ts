import { desc, eq } from "drizzle-orm";
import type { RenderableBrief } from "../brief/render";
import { appStore, schema } from "./client";

// The most recent brief run recorded for an account: when it ran, what the grounding gate did, and
// the brief itself.

export type LatestBrief = {
  brief: RenderableBrief | null;
  createdAt: Date;
  groundedClaims: number;
  droppedClaims: number;
};

// Returns null rather than throwing when the app-store is unreachable. The brief is the payoff on this
// page but it is not the page: an SE who came to read the evidence should still get the evidence, with
// the brief section saying it could not be loaded. The caller decides that, which is why this shape
// carries no error of its own and the page settles the promise.
export async function getLatestBrief(accountId: string): Promise<LatestBrief | null> {
  const [run] = await appStore()
    .select({
      brief: schema.briefRuns.brief,
      createdAt: schema.briefRuns.createdAt,
      groundedClaims: schema.briefRuns.groundedClaims,
      droppedClaims: schema.briefRuns.droppedClaims,
    })
    .from(schema.briefRuns)
    .where(eq(schema.briefRuns.accountId, accountId))
    .orderBy(desc(schema.briefRuns.createdAt))
    .limit(1);

  if (!run) return null;
  return {
    brief: run.brief,
    createdAt: run.createdAt,
    groundedClaims: run.groundedClaims ?? 0,
    droppedClaims: run.droppedClaims ?? 0,
  };
}

// Kept for callers that only want the run statistics. Reading the whole jsonb payload to count two
// integers would be wasteful on a list view.
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
