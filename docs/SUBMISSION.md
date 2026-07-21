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

**What moves to Vercel:** the copilot. It reads across the line and drafts. The only thing it writes anywhere is a brief posted into a Slack channel, on request. No system of record is ever written to.

The test a security team applies is "if this vendor vanished tomorrow, are we whole?" Under this design the answer is yes. Every system of record is untouched and complete; Vercel holds derived state only: run metadata, per-run cost, the citation index, an evidence ledger of what each live read returned in that run, and a receipt per Slack delivery.

### Target-state flow

```
Slack (#acct-northwind)          Web app (st-eve-v2.vercel.app)
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
              same card either way, and the web app
              can post the one it is showing to Slack
```

**Two surfaces, two jobs.** Slack is for the quick answer in the account channel, so an AE or CSM can self-serve the current picture without waiting on the SE. The web app is where the SE works: the full evidence trail behind a brief, what the gate withheld, the last brief Steve shipped for an account, and a button to post that brief into the account channel. A separate page names each source and how Steve authenticates to it.

---

## 3. Vercel choices

Three headline picks, and two defaults they run on.

### eve: the agent layer

Durable sessions, typed read-only tools, the native Slack channel, and a run trace per turn. A brief is a multi-step tool loop that takes most of a minute; eve checkpoints each step, so a crash or a redeploy mid-run resumes rather than restarts.

*Trade-off:* eve is in **public beta**. APIs may change before GA. Taken with eyes open because the alternative is hand-rolling session durability, a Slack ack path, and a tool harness, all of which are the parts most likely to be subtly wrong. The fallback if it churns is `WorkflowAgent` inside `'use workflow'`, keeping the gate and the Gateway.

### AI Gateway: model routing and cost

One API, provider failover, and per-run cost reported back. In production there is no gateway key at all: the deployment authenticates to the Gateway with its Vercel OIDC token, so there is no provider credential in the environment to rotate or leak. Model choice is a runtime decision: a brief routes to Sonnet, a follow-up in the thread routes to Haiku.

That split came from measurement, not preference. A brief's four model steps are wildly uneven: one recorded run produced 39, 107, 2,662 and 575 output tokens, and the next produced 59, 107, 2,250 and 528. The big step is `emit_brief` composing the cited claims, which is also where quality matters most, so a cheaper model on the small steps saves nothing. Routing whole turns by intent does.

*Trade-off:* a heuristic decides intent, so it can misroute. The test is deliberately biased toward the stronger model, because a wrong brief is visible to whoever asked and a slightly over-provisioned question costs a fraction of a cent.

### Vercel Connect and OIDC: the credential plane

Steve authenticates to Slack and Linear through Connect. Tokens are minted per request, rotate server-side, and are revoked from a dashboard without a redeploy. **There is no `SLACK_BOT_TOKEN` in the environment.**

It works both ways: the inbound channel takes its bot token from Connect on every webhook, and an SE reading a brief on the web can post it into the account channel with a Connect-minted app token, rendered by the same card function the agent posts from a mention.

The warehouse credential does not come from Connect, and that is a third mechanism rather than a gap. The deployment presents the OIDC token Vercel signs for it to Vault, which binds the role on the immutable `owner_id` and `project_id` claims plus `environment`, and mints a Postgres role that expires. Nothing in the environment is a database password. `/health/vault` reports the mode and the live lease id.

*Trade-off, and it cost us a source:* Connect is beta and its connector types are not uniform. Linear's offers app-scoped tokens; Notion's is user-subject only and its grant did not survive a session boundary, so Notion is parked (§7).

### Substrate

**Fluid Compute** is the runtime, in `iad1`. Active-CPU billing suits a workload that spends most of its wall clock waiting on a model rather than burning CPU. Putting the functions in `iad1` also puts them in the same region as the warehouse in us-east-1, so the cross-account read is a same-region hop that measures in the tens of milliseconds. The boundary Steve crosses is a trust boundary, not a distance one.

**Cache Components** carries the read surfaces. Three routes prerender a static shell and stream their reads behind Suspense: the dashboard, an account page, and the integrations page. The dashboard is the case that makes it worth it. The shell arrives in about 200ms and the streamed content finishes at about 1.6s. That gap is the difference between a blank page and a usable one while the reads land.

### What changes for the customer

- An SE stops reconstructing accounts by hand.
- The account team stops waiting on the SE for a status read.
- Every claim carries the record that backs it, so a brief can be checked in seconds rather than trusted on faith.

---

## 4. Working demo

**URL:** https://st-eve-v2.vercel.app · **Repo:** https://github.com/demovercelyusuf/st-eve-v2

No login. Sixty seconds, no context required. Start at **/dashboard**, where a guided tour picks up a first-time visitor and names the surfaces.

1. Open **/chat** and click **"Give me this week's brief for Northwind."**
2. Watch it read the warehouse, Salesforce and Linear, then return a cited brief. The tool calls are named on screen as they run, next to the model the Gateway routed the turn to.
3. Open **/accounts/ACC-2041** for the evidence behind that brief, what the gate withheld, and a **Post to Slack** button that puts the same card in the account channel.
4. Open **/integrations** for every source and the credential Steve presents to it, measured when the page loads.
5. Open **/health/vault** for the lease id of the Postgres role the running deployment is using, and **/health/boundary** for a live cross-boundary read and its latency.

Canned prompts on `/chat` each exercise a different path: the flagship brief, a follow-up that routes to the fast model, the live Linear read, and a second account.

**Crossing the boundary is real.** `/health/boundary` reads RDS in us-east-1 on every request and reports the latency of the whole read. Linear is read live over its API with a Connect-minted token.

**Vault is in the deployment, not just the repo.** `/health/vault` reports mode `vault`, the leased username, the lease id and the seconds left on it. The role is minted per lease, and the read path never touches a standing password.

---

## 5. Rollout plan

This is the process the repo is built under, not a proposal. Every change ships through the same gate.

**The infrastructure is code, and so is the boundary.** Two Terraform configurations in `terraform/`, both with state in HCP Terraform. `terraform/warehouse` manages the RDS instance and its security group, adopted into state by import rather than recreated, so the existing database was brought under management without a migration. `terraform/vault` manages the parts of the credential path that matter: the database secrets mount, the connection to RDS, the `warehouse-reader` role and its TTL, the JWT auth backend pointed at Vercel's OIDC issuer, and the two claim-bound roles for production and preview.

The reason this matters more than tidiness is that the trust boundary is now a diff. Who can mint a warehouse credential, under which claims, for how long, is four resources in `terraform/vault` rather than the state of a console someone clicked. A security reviewer reads the change, not the outcome.

One thing writing the policy down surfaced: Vercel signs every tenant's OIDC token with the same key, so `bound_claims` has to carry `owner_id` and `project_id` explicitly. Binding on `environment` alone would accept a token from any Vercel account.

**Preview.** Every push to a branch gets a preview deployment against the same RDS. `terraform/vault/auth.tf` defines two JWT roles, one bound to `environment = production` and one to `environment = preview`, both also bound on `owner_id` and `project_id` because those are immutable ids and the slug claims are rewritten on rename. A preview deployment cannot present as production, and its token lives 300 seconds against production's 900. Worth being precise about what that does not buy: both roles read the same `warehouse-reader` path against the same instance, so this separates credentials, not data.

**Validation.** CI is a required status check: typecheck, 42 tests, and a production build. It is hermetic, with no network and no database, so it never goes red because a provider had a bad minute. The grounding gate's tests run here.

**Canary.** Rolling Releases at the project level, promoting by percentage with the grounding eval as the gate. `rollingRelease` is project configuration via CLI, dashboard or API, not a `vercel.json` key.

**Cutover.** Merge to `main` deploys production. The preview has already been verified against real infrastructure by then.

**Rollback.** An alias flip to the previous deployment. Seconds, no rebuild.

### What an incident looks like mid-rollout

A bad release is caught at one of three points, and each has a different response.

**Before promotion.** CI fails, or the preview does not behave against real infrastructure. Nothing reaches production; the branch is fixed and re-verified.

**During canary.** The grounding eval or error rate degrades on the percentage receiving the new release. The rollout is aborted and traffic returns to the previous deployment without a rebuild.

**After cutover.** An alias flip to the last known-good deployment. Seconds, and it requires no build, so recovery time does not depend on how long the app takes to compile.

The gap worth naming: a green test suite is not a green deployment. CI here is hermetic by design, with no network and no database, which keeps it from failing on a provider's bad minute but also means it cannot catch a failure that only occurs at install or deploy time. Preview deployments are what close that gap, which is why promotion requires a verified preview and not just a passing build.

---

## 6. Success measures

### Technical

| Measure | Source | Target |
| --- | --- | --- |
| Grounded claim rate | `brief_runs.grounded_claims` vs `dropped_claims` | 100% of shipped claims cited, by construction |
| Withheld claims per brief | `citations` where `status = dropped` | Tracked, not minimised. A rising number means the model is reaching, not that the product is worse |
| Cost per brief | `model_runs.cost_usd` summed per session | Two recorded briefs cost $0.033 and $0.037 |
| Boundary latency | `/health/boundary`, one figure for the whole cross-boundary read | Measured at 4 to 45ms from iad1 |
| Brief latency | Not instrumented. Would need a `turn.completed` hook writing a duration | Under 60s, observed |

The first three come from data the app already persists. The last two do not: boundary latency is measured live by the endpoint and never stored, and brief latency has no source at all today. Saying so is cheaper than implying a dashboard that does not exist.

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

**Nothing in the app authenticates anybody, and one unauthenticated route now writes.** `agent/channels/eve.ts` attaches a fixed operator principal, so anyone who can reach the URL can run a turn. `/api/slack/post-brief` goes further: it validates the body shape and then posts into a Slack channel with a Connect-minted token, with no caller check at all. Anyone who can construct a well-formed brief can put it in the customer's channel. That is acceptable for a single-tenant demo on an unadvertised URL and it is not acceptable anywhere else. Production replaces one authenticator with Okta via `oidc()`, after which `principalId` is the OIDC subject and nothing downstream changes, and the write route gates on the same principal.

**Steve writes in exactly one place.** The web app can post a brief into a Slack channel. It writes a message, never a record in a system of record, and it does so through the same `briefCard` the agent posts from a mention. Worth naming here rather than letting §2 be read as absolute.

**The app-store database still uses a standing password.** Vault mints the warehouse credential, but the copilot's own derived state, run metadata, cost and the citation index, connects with a standing `APPSTORE_DATABASE_URL` held in the environment. Putting it behind the same database secrets engine is the same shape of work, and it is not done.

**The warehouse is open to the internet.** The RDS security group allows tcp/5432 from `0.0.0.0/0`. Two callers have to reach it and neither has a stable CIDR: Vercel functions egress from shared addresses on this plan, and the Vault cluster is HCP-managed in us-west-2 with no peering into the VPC. Narrowing the rule breaks both. The production shape is Vercel Secure Compute for a dedicated egress range plus an HVN peering for Vault, which turns this into two narrow rules and lets `publicly_accessible` go false.

**TLS to RDS is encrypted but not verified.** `lib/db/config.ts` sets `rejectUnauthorized: false`, because node-postgres reads `sslmode=require` as full CA verification and rejects the RDS chain. Production pins the RDS CA bundle instead. Until then the connection resists eavesdropping but not an active man in the middle.

**Preview is a single security principal, and that cannot be fixed here.** The Vault JWT role binds `{owner_id, project_id, environment}`, all immutable ids. The Vercel OIDC token carries no deployment or branch claim, so every preview across every branch presents an identical claim set. Per-branch authorisation is structurally impossible with this token, not merely unimplemented. Preview and production also read the same RDS instance, so the separate role separates credentials rather than data.

**A standing warehouse DSN is retained as the rollback.** `WAREHOUSE_DATABASE_URL` is still set in production on purpose. The read path cannot reach it while `VAULT_ADDR` is present, so it is unreachable in normal operation, and unsetting one variable is what makes an unreachable Vault survivable without a code change. It is a real trade: the environment holds a password that the code will not use.

**Salesforce is mocked.** It is the `sfdc` schema inside the same RDS database as the warehouse, read through an adapter that treats it as a distinct system. It also shares the warehouse's leased credential rather than holding one of its own, so the isolation is a schema boundary and not a trust boundary. The swap to a real org is one driver behind that seam. **"Steve reads a live Salesforce" would be false today** and I would not say it.

**Notion is not integrated.** Its Connect connector is Custom OAuth with user subjects only, and a user grant did not survive a session boundary: the callback binds to the run that requested it, so the next session demanded a fresh device-code handshake. As an MCP connection its authorization belongs to eve's runtime, so there was no seam to fail soft through, and three consecutive briefs produced nothing. Parked for Q4 as an authored tool that can degrade the way Linear's does.

**The Linear grant is broader than the application.** The connector holds write scope and access to all public teams. Nothing in the code writes. Narrowing it to read-only is a five-minute change that should happen before production.

**There is no cache invalidation path.** `updateTag` only works inside Server Actions and this app has none. Cached surfaces expire on their `cacheLife` profile rather than on an event. A pipeline-completion webhook is the right trigger and it is not built.

**Sessions never end, and there is no retention policy.** An eve session is a durable Vercel Workflow. A turn finishes with `turn.completed` and the session then parks on `session.waiting`, holding a continuation token so a follow-up resumes the same conversation with its full history. Nothing closes it.

Parked is not running: the runtime suspends the workflow and holds no compute until the next input arrives, so the cost is negligible. The problem is retention, not spend. A parked session holds conversation history about a customer's accounts, and at 200 SEs those accumulate indefinitely with no expiry.

**The intended policy is a 15 minute idle TTL**, after which a session ends and its history is discarded. It is not implemented, because eve 0.25.2 exposes no way to end a session: a session exposes `id`, `continuationToken`, `cancel()` and an event stream, and cancelling a turn is confirmed by `turn.cancelled` followed by `session.waiting`, which is to say the session stays open.

Until the framework offers one, there is only one option that actually works: an out-of-band sweeper against the Workflows API that ends the run. The application-level alternative, a record of session age that refuses to resume a session past its TTL, does not do the job. Refusing to resume stops new turns but never drives the run terminal, so the workflow stays parked holding its history and the retention clock never starts. It would look like a policy without being one. The sweeper is not built.

**The gate catches unbacked claims, not bad judgement.** It proves a citation resolves to a real record. It cannot tell you the model read that record correctly. That limit is why Steve proposes and never writes to a system of record.

---

## 8. Development tooling and AI validation

**Built with** Claude Code (Opus 4.8) as the coding agent, plus three Vercel-published agent skills: `next-cache-components-adoption`, `next-cache-components-optimizer` and `vercel-react-best-practices`. `skills-lock.json` records the exact versions.

The cache-components skill shaped the migration. Its guidance is **translate, don't delete**: a `force-dynamic` export encodes behaviour the route still needs, so adopting Cache Components means restructuring each page into a static shell and a Suspense-wrapped data child rather than removing a config line.

### How AI behaviour is validated

**The gate is code, not a prompt.** `lib/grounding/gate.ts` is a pure function over a set of known ids. It has no model in it, so its behaviour is deterministic and unit-testable.

| Check | What it proves | Runs |
| --- | --- | --- |
| `lib/grounding/gate.test.ts` | An unbacked claim and a fabricated citation are both withheld | CI |
| `lib/citations/registry.test.ts` | No two source prefixes overlap, so an id cannot resolve against the wrong system | CI |
| `lib/seed/examples.test.ts` | Every citation id named in the agent's prompt resolves to a real record | CI |
| `lib/slack/brief-card.test.ts` | The brief renders inside Slack's block and character limits, including when every field is oversized | CI |
| `lib/auth/scope.test.ts` | A principal cannot read outside the scope its channel granted | CI |
| `lib/model/config.test.ts` | Intent routing picks the intended model, and falls back to the stronger one | CI |
| `evals/grounding.eval.ts` | A live agent run cites real record ids | Against a deployed target |
| `scripts/check-boundary.ts` | The cross-boundary read returns real rows | Manual, pre-demo |
| `/health/vault` | Production reads RDS under a Vault lease, and names the lease that did it | Live, every request |
| `scripts/check-vault.ts` | The same proof from a laptop, against any Vault | Manual |

**Two of those checks guard failures that types cannot catch.**

The example-id guard asserts that every citation id named in the agent's instructions resolves to a real seeded record. A prompt is prose, so it does not typecheck: if the data changes underneath it, the model can be taught to produce ids that will never resolve, and nothing in a normal build would notice.

The Slack card is rendered through eve's actual `cardToBlocks` against a real brief rather than a hand-written fixture. A fixture asserts the shape its author expected; rendering the genuine artifact asserts the shape the system actually produces, including the block and character limits Slack enforces at post time.

`/health/vault` is the one that runs continuously. It reports the identity that actually served the read rather than minting a second lease to describe the first, which is the difference between proving the credential path and demonstrating it.

**The honest limit.** On a well-instructed model over clean data, the gate has nothing to catch: a live run withheld zero claims even when asked a leading question designed to invite an unbacked competitor name. The gate is a backstop, not a party trick. Its value is deterministic proof under the fixture tests, and the fact that on the day the model does reach, the reach does not ship.
