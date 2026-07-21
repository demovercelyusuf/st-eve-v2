# Steve

The enterprise copilot for the technical win.

**Live demo:** https://st-eve-v2.vercel.app · **Repo:** https://github.com/demovercelyusuf/st-eve-v2

---

## 1. Problem statement

**Customer.** Vantage, a roughly 2,000-person B2B data-platform vendor. Around 200 Solutions Engineers and Solutions Architects support about 8,000 accounts.

**Current stack.** Salesforce is the CRM system of record. An account-activity warehouse in their own AWS account (Postgres, us-east-1) holds Gong call transcripts and weekly product-usage rollups, landed by an existing Fivetran and dbt pipeline. Linear tracks every issue raised against an account during an evaluation. Slack is where the account team actually talks. Okta is identity, Vault is secrets.

**The pain.** Before a QBR, a renewal, or any "where are we on this account?", an SE reconstructs the account by hand across four systems. Across an SE org that size it is roughly a day a week per rep spent assembling context instead of solving technical problems.

The sharper cost is the bottleneck. An AE or CSM who needs the current picture has to ask the SE and wait. The SE is the only person who can assemble it, so account knowledge moves at their calendar.

**Why an earlier attempt failed.** An in-house assistant was built and abandoned for one reason: it made things up. It produced fluent summaries that named competitors nobody had mentioned and asserted commitments nobody had made. **An unreliable copilot is worse than none**, because a wrong brief is acted on before it is checked.

That failure is the design constraint, not a footnote. Everything below exists to make ungrounded output structurally impossible rather than merely unlikely.

---

## 2. Current state and target state

### What stays, and why

| System | Stays where | Why |
| --- | --- | --- |
| **Salesforce** | Vantage's org | System of record for the deal. Steve reads it; it is never the copilot's to own. |
| **Activity warehouse** | Their AWS, us-east-1 | Holds the raw signal: call transcripts, usage. Sensitive, already governed, and their pipeline already models it. Replicating it to Vercel would move the most sensitive data across a boundary for no gain. |
| **Linear** | Their workspace | Engineering's view of the account. Read live over its API. |
| **Slack** | Their workspace | Where the account team already is. Steve delivers there rather than asking people to visit somewhere new. |
| **Okta** | Identity provider | Steve does not build a parallel user store. |
| **Vault** | Their secrets platform | Mints the warehouse credential. Steve holds no standing database password. |

**What moves to Vercel:** the copilot. It reads across the line and drafts. It writes to nothing.

The test a security team applies is "if this vendor vanished tomorrow, are we whole?" Under this design the answer is yes. Every system of record is untouched and complete; Vercel holds derived state only, which is run metadata, per-run cost, and the citation index.

### Target-state flow

```
Slack (#acct-northwind)          Web app (steve.vercel.app)
   @Steve brief Northwind           the SE's working surface
            │                              │
            └──────────────┬───────────────┘
                           ▼
                   eve durable session
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  Warehouse (RDS)      Salesforce           Linear
  us-east-1            adapter seam         live, via Connect
  GONG- USG-           OPP- CON-            LIN-
        └──────────────────┼──────────────────┘
                           ▼
                  emit_brief + grounding gate
              every claim resolves to a record id,
              or it is withheld and shown as withheld
                           ▼
                   cited brief, both surfaces
```

**Two surfaces, two jobs.** Slack is for the quick answer in the account channel, so an AE or CSM can self-serve the current picture without waiting on the SE. The web app is where the SE works: the full evidence trail, what the gate withheld, run history and cost. Removing the bottleneck and doing the job are different problems and they get different surfaces.

---

## 3. Vercel choices

Three headline picks, and two defaults they run on.

### eve: the agent layer

Durable sessions, typed read-only tools, the native Slack channel, and a run trace per turn. A brief is a multi-step tool loop that takes most of a minute; eve checkpoints each step, so a crash or a redeploy mid-run resumes rather than restarts.

*Trade-off:* eve is in **public beta**. APIs may change before GA. Taken with eyes open because the alternative is hand-rolling session durability, a Slack ack path, and a tool harness, all of which are the parts most likely to be subtly wrong. The fallback if it churns is `WorkflowAgent` inside `'use workflow'`, keeping the gate and the Gateway.

### AI Gateway: model routing and cost

One credential, one API, provider failover, and per-run cost reported back. Model choice is a runtime decision: a brief routes to Sonnet, a follow-up in the thread routes to Haiku.

That split came from measurement, not preference. A brief's four model steps produced 39, 160, **4,049** and 598 output tokens. The expensive step is composing the cited claims, which is also where quality matters most, so a cheaper model on the small steps saves nothing. Routing whole turns by intent does.

*Trade-off:* a heuristic decides intent, so it can misroute. The test is deliberately biased toward the stronger model, because a wrong brief is visible to whoever asked and a slightly over-provisioned question costs a fraction of a cent.

### Vercel Connect: the credential plane

Steve authenticates to Slack and Linear through Connect. Tokens are minted per request, rotate server-side, and are revoked from a dashboard without a redeploy. **There is no `SLACK_BOT_TOKEN` in the environment.**

*Trade-off, and it cost us a source:* Connect is beta, and its connector types are not uniform. Linear's connector offers app-scoped tokens, so it needs no per-person handshake. Notion's is Custom OAuth with user subjects only, and a user grant did not survive a session boundary, so it demanded a browser handshake per brief. Notion is parked (§7).

### Substrate

**Fluid Compute** is the runtime. Active-CPU billing suits a workload that spends most of its wall clock waiting on a model or a cross-region query.

**Cache Components** carries the read surfaces. Four routes prerender a static shell and stream the boundary reads behind Suspense. On a page whose latency budget is a round trip to us-east-1, the shell arriving first is the difference between a blank page and a usable one.

### What changes for the customer

- An SE stops reconstructing accounts by hand.
- The account team stops waiting on the SE for a status read.
- Every claim carries the record that backs it, so a brief can be checked in seconds rather than trusted on faith.

---

## 4. Working demo

**URL:** https://st-eve-v2.vercel.app · **Repo:** https://github.com/demovercelyusuf/st-eve-v2

No login. Sixty seconds, no context required:

1. Open **/chat** and click **"Give me this week's brief for Northwind."**
2. Watch it read the warehouse, Salesforce and Linear, then return a cited brief.
3. Open **/accounts/ACC-2041** for the evidence behind it, and **/spend** for what the run cost.
4. Open **/health/boundary** for a live cross-boundary read with per-system latency.

Canned prompts on `/chat` each exercise a different path: the flagship brief, a follow-up that routes to the fast model, the live Linear read, and a second account.

**Crossing the boundary is real.** `/health/boundary` reads RDS in us-east-1 on every request and reports latency. Linear is read live over its API with a Connect-minted token.

---

## 5. Rollout plan

This is the process the repo was actually built under, not a proposal. Fourteen pull requests, every one through the same gate.

**Preview.** Every push to a branch gets a preview deployment against the same RDS. Vault's JWT role binds `{project, environment}` claims, so a preview token structurally cannot assume the production database role. That is a signature check, not a policy.

**Validation.** CI is a required status check: typecheck, 39 tests, and a production build. It is hermetic, with no network and no database, so it never goes red because a provider had a bad minute. The grounding gate's tests run here.

**Canary.** Rolling Releases at the project level, promoting by percentage with the grounding eval as the gate. `rollingRelease` is project configuration via CLI, dashboard or API, not a `vercel.json` key.

**Cutover.** Merge to `main` deploys production. The preview has already been verified against real infrastructure by then.

**Rollback.** An alias flip to the previous deployment. Seconds, no rebuild.

### What an incident actually looked like

Production failed to deploy for five hours. `pnpm-workspace.yaml` had been committed with its placeholder text still in it, so esbuild and sharp were never allowed to run their install scripts, and pnpm 11 treats an ignored build as a hard error. Every install exited 1.

**CI stayed green the whole time**, because the failure was in the install step on Vercel rather than in the test suite. The fix went through preview, CI and merge like everything else. The lesson is in the plan now: a green test suite is not a green deployment, and the gap between them is where this class of failure lives.

---

## 6. Success measures

Every metric below is derived from data the app already persists, so none of them require new instrumentation.

### Technical

| Measure | Source | Target |
| --- | --- | --- |
| Grounded claim rate | `brief_runs.grounded_claims` vs `dropped_claims` | 100% of shipped claims cited, by construction |
| Withheld claims per brief | `citations` where `status = dropped` | Tracked, not minimised. A rising number means the model is reaching, not that the product is worse |
| Cost per brief | `model_runs.cost_usd` summed per session | Currently ~$0.05 |
| Boundary latency | `/health/boundary`, per system | Warehouse under 100ms from iad1 |
| Brief latency | turn start to `turn.completed` | Under 60s |

### Business

| Measure | Baseline | How it is read |
| --- | --- | --- |
| SE hours reclaimed | ~1 day/week/rep on reporting | Briefs run per SE per week against time previously spent assembling |
| Time to an account answer | Hours, gated on SE availability | Minutes, self-served in the account channel |
| Briefs self-served by non-SEs | Zero | Share of Slack briefs requested by AEs, CSMs and support |

That last one is the real measure. It is the difference between making the SE faster and removing them from the critical path.

---

## 7. Known limitations and risks

What I would tell the customer before kickoff.

**eve and Vercel Connect are both in public beta.** APIs may change before GA. This is early adoption with eyes open, and the fallback for each is named in §3.

**Notion is not integrated.** Its Connect connector is Custom OAuth with user subjects only, and a user grant did not survive a session boundary: the callback binds to the run that requested it, so the next session demanded a fresh device-code handshake. As an MCP connection its authorization belongs to eve's runtime, so there was no seam to fail soft through, and three consecutive briefs produced nothing. Parked for Q4 as an authored tool that can degrade the way Linear's does.

**Salesforce is mocked.** It is a separate schema in the same RDS instance, read through an adapter that treats it as a distinct system. The swap to a real org is one driver behind that seam. **"Steve reads a live Salesforce" would be false today** and I would not say it.

**The Linear grant is broader than the application.** The connector holds write scope and access to all public teams. Nothing in the code writes. Narrowing it to read-only is a five-minute change that should happen before production.

**Vault is proven locally, not in the deployment.** `scripts/check-vault.ts` demonstrates the app reading RDS with a leased, short-TTL credential and no standing password. The deployment has no `VAULT_ADDR`, so it falls back to a standing connection string. Standing up HCP Vault is what closes this, and it is the next piece of work.

**The connection pool outlives the Vault lease.** `lib/warehouse/client.ts` caches the pool in module scope, so a lease TTL is never honoured after first construction. A warm instance older than the lease will fail its first read. The fix is rebuilding the pool at ~80% of TTL.

**The agent authenticates nobody.** `agent/channels/eve.ts` attaches a fixed operator principal, so anyone who can reach the URL can run a turn. Acceptable for a single-tenant demo on an unadvertised URL. Production replaces one authenticator with Okta via `oidc()`, after which `principalId` is the OIDC subject and nothing downstream changes.

**There is no cache invalidation path.** `updateTag` only works inside Server Actions and this app has none. Cached surfaces expire on their `cacheLife` profile rather than on an event. A pipeline-completion webhook is the right trigger and it is not built.

**The gate catches unbacked claims, not bad judgement.** It proves a citation resolves to a real record. It cannot tell you the model read that record correctly. That limit is why Steve proposes and never writes.

---

## 8. Development tooling and AI validation

**Built with** Claude Code (Opus 4.8) as the coding agent, plus three Vercel-published agent skills: `next-cache-components-adoption`, `next-cache-components-optimizer` and `vercel-react-best-practices`. `skills-lock.json` records the exact versions.

The cache-components skill materially changed the work. My plan was to delete the five `force-dynamic` exports; the skill's guidance is **translate, don't delete**, because each export encodes behaviour the route still needs. Deleting them turned one config error into five blocking-prerender errors and revealed the actual work.

### How AI behaviour is validated

**The gate is code, not a prompt.** `lib/grounding/gate.ts` is a pure function over a set of known ids. It has no model in it, so its behaviour is deterministic and unit-testable.

| Check | What it proves | Runs |
| --- | --- | --- |
| `lib/grounding/gate.test.ts` | An unbacked claim and a fabricated citation are both withheld | CI |
| `lib/citations/registry.test.ts` | No two source prefixes overlap, so an id cannot resolve against the wrong system | CI |
| `lib/seed/examples.test.ts` | Every citation id named in the agent's prompt resolves to a real record | CI |
| `lib/slack/brief-card.test.ts` | The brief renders inside Slack's block and character limits, including when every field is oversized | CI |
| `evals/grounding.eval.ts` | A live agent run cites real record ids | Against a deployed target |
| `scripts/check-boundary.ts` | The cross-boundary read returns real rows | Manual, pre-demo |
| `scripts/check-vault.ts` | The app reads RDS with a leased credential | Manual |

**Two of those tests were written because a regression got through.**

The example-id guard exists because the seed was rewritten, `GONG-882` stopped existing, and the agent's instructions went on naming it. Nothing failed, because a prompt is prose and prose does not typecheck. The model was being taught to produce ids that could never resolve.

The Slack card is tested by rendering a **real production brief** through eve's actual `cardToBlocks`, not a hand-written fixture. That is what caught a card titled `Weekly brief: undefined`. The gate returns everything except the account name, and nothing put it back. A fixture I wrote myself would have included the field and hidden the bug.

**The honest limit.** On a well-instructed model over clean data, the gate has nothing to catch: a live run withheld zero claims even when asked a leading question designed to invite an unbacked competitor name. The gate is a backstop, not a party trick. Its value is deterministic proof under the fixture tests, and the fact that on the day the model does reach, the reach does not ship.
