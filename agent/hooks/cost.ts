import { defineHook } from "eve/hooks";
import { recordModelRun } from "../../lib/appstore/runs";
import { BRIEF_MODEL } from "../../lib/model/config";

// Captures per-run cost. Every model step reports its usage (tokens and the AI Gateway's own
// costUsd) on step.completed; this hook records one row per step, keyed by session, so the spend
// view can sum a run's true cost. Observe-only: a failure here never breaks the turn.

type StepUsage = {
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
};

type StepData = {
  stepIndex?: number;
  finishReason?: string;
  usage?: StepUsage;
  providerMetadata?: { gateway?: { generationId?: string } };
};

export default defineHook({
  events: {
    async "step.completed"(event, ctx) {
      const data = (event.data ?? {}) as StepData;
      const usage = data.usage ?? {};
      try {
        await recordModelRun({
          sessionId: ctx.session.id,
          stepIndex: data.stepIndex ?? 0,
          model: BRIEF_MODEL,
          inputTokens: usage.inputTokens ?? null,
          outputTokens: usage.outputTokens ?? null,
          cacheReadTokens: usage.cacheReadTokens ?? null,
          costUsd: usage.costUsd ?? null,
          generationId: data.providerMetadata?.gateway?.generationId ?? null,
          finishReason: data.finishReason ?? null,
        });
      } catch {
        // observability must never break the turn
      }
    },
  },
});
