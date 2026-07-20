import { defineEval } from "eve/evals";
import { equals, includes } from "eve/evals/expect";

// Drives the real agent through a Northwind brief and checks that it grounds: the turn completes, it
// reads the warehouse and Salesforce, it delivers through the emit_brief gate (not free text), and
// the shipped brief cites real activity ids. This is the AI-behavior check that complements the
// deterministic gate unit tests.
export default defineEval({
  description: "The copilot produces a grounded brief for Northwind, delivered through the gate and cited.",
  async test(t) {
    await t.send("Give me this week's brief for Northwind.");

    t.succeeded();
    t.calledTool("read_account_activity");
    t.calledTool("read_salesforce");
    t.calledTool("emit_brief");

    t.check(t.reply ?? "", includes("Northwind"));
    // A grounded brief cites real activity ids (ZD-, GONG-, USG-) rather than asserting bare claims.
    t.check(/\b(ZD|GONG|USG)-\d/.test(t.reply ?? ""), equals(true));
  },
});
