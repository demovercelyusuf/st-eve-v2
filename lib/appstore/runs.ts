import type { BriefSource, RenderableBrief } from "../brief/render";
import type { ShippedBrief } from "../brief/schema";
import { appStore, schema } from "./client";

// Records a brief run and its dropped claims to the app-store: the copilot's own derived state, kept
// so the app can show grounding stats and per-run cost and prove the gate did its job. The customer's
// systems of record are never touched here.

export async function recordBriefRun(
  accountId: string,
  result: Omit<ShippedBrief, "account" | "accountId">,
  meta?: { sessionId?: string; account?: string; sources?: BriefSource[] },
): Promise<string> {
  const db = appStore();

  // The renderable brief is assembled here rather than at read time, because everything it needs is
  // already in hand at exactly this moment: the gate's result, the resolved account name, and the
  // source list carrying the urls the evidence ledger recorded during this run. That ledger is scoped
  // to the session, so a page reading it days later could not rebuild the clickable half of a
  // citation. Freezing the artifact when it ships is the only point where it is complete.
  const brief: RenderableBrief = {
    account: meta?.account ?? accountId,
    accountId,
    ...result,
    sources: meta?.sources,
  };

  const [run] = await db
    .insert(schema.briefRuns)
    .values({
      accountId,
      sessionId: meta?.sessionId ?? null,
      status: "shipped",
      grounded: true, // every shipped claim is cited by construction
      groundedClaims: result.grounding.citedClaims,
      droppedClaims: result.grounding.droppedClaims,
      brief,
    })
    .returning({ id: schema.briefRuns.id });

  if (result.needsReview.length > 0) {
    await db.insert(schema.citations).values(
      result.needsReview.map((d) => ({
        briefRunId: run.id,
        claim: d.text,
        activityId: null,
        status: "dropped",
      })),
    );
  }

  return run.id;
}

// One model step's usage, as the AI Gateway reported it. Written by the cost hook.
export async function recordModelRun(row: {
  sessionId: string;
  stepIndex: number;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  costUsd: number | null;
  generationId: string | null;
  finishReason: string | null;
}): Promise<void> {
  const db = appStore();
  await db.insert(schema.modelRuns).values(row);
}
