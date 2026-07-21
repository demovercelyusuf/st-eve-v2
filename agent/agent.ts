import { defineAgent, defineDynamic } from "eve";
import { BRIEF_MODEL, FAILOVER_ORDER, modelForMessage } from "../lib/model/config";

// The model is chosen per turn, at turn.started, from what the turn is asking for. Composing a brief
// gets the stronger model; a follow-up in the thread gets the faster one.
//
// This is the AI Gateway decision made visible. One credential and one API, so which model serves a
// turn is a runtime choice rather than a deployment.
const model = defineDynamic({
  fallback: BRIEF_MODEL,
  events: {
    "turn.started"(event: unknown) {
      // Read defensively. This runs on every turn, and a shape change should degrade to the fallback
      // rather than fail the run: the wrong model is a worse brief, no model is no brief at all.
      const data = (event as { data?: { message?: unknown } } | undefined)?.data;
      const message = typeof data?.message === "string" ? data.message : undefined;
      return modelForMessage(message);
    },
  },
});

export default defineAgent({
  model,
  modelOptions: {
    // AI Gateway provider failover: try these providers in order for whichever model was selected, so
    // a single provider being rate-limited or down never takes the copilot offline.
    providerOptions: {
      gateway: { order: FAILOVER_ORDER },
    },
  },
});
