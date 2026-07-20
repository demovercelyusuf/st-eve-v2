import type { ShippedBrief } from "../brief/schema";
import { appStore, schema } from "./client";

// Records a brief run and its dropped claims to the app-store: the copilot's own derived state, kept
// so the app can show grounding stats and per-run cost and prove the gate did its job. The customer's
// systems of record are never touched here.

export async function recordBriefRun(
  accountId: string,
  result: Omit<ShippedBrief, "account" | "accountId">,
  meta?: { model?: string; costUsd?: number },
): Promise<string> {
  const db = appStore();
  const [run] = await db
    .insert(schema.briefRuns)
    .values({
      accountId,
      status: "shipped",
      grounded: true, // every shipped claim is cited by construction
      groundedClaims: result.grounding.citedClaims,
      droppedClaims: result.grounding.droppedClaims,
      model: meta?.model ?? null,
      costUsd: meta?.costUsd ?? null,
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
