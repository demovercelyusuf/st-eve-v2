import { defineAgent } from "eve";
import { BRIEF_MODEL, FAILOVER_ORDER } from "../lib/model/config";

export default defineAgent({
  model: BRIEF_MODEL,
  modelOptions: {
    // AI Gateway provider failover: try these providers in order for the model above, so a single
    // provider being rate-limited or down never takes the copilot offline.
    providerOptions: {
      gateway: { order: FAILOVER_ORDER },
    },
  },
});
