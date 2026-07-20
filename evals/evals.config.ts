import { defineEvalConfig } from "eve/evals";

// Deterministic evals only, so no judge model is configured. Run with `eve eval` against a local dev
// server, or `eve eval --url <deployment>` against production.
export default defineEvalConfig({});
