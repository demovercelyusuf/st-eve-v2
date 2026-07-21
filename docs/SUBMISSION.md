# Steve

The copilot for the technical win.

**Live demo:** https://st-eve-v2.vercel.app · **Repo:** https://github.com/demovercelyusuf/st-eve-v2

---

## 1. Problem statement

**Customer.** Vantage, a roughly 2,000-person B2B data-platform vendor. Around 200 Solutions Engineers and Solutions Architects support about 8,000 accounts.

**Current stack.** Salesforce is the CRM system of record. An account-activity warehouse in their own AWS account holds call transcripts and weekly product-usage rollups, landed by an existing Fivetran and dbt pipeline. Linear tracks every issue raised against an account during an evaluation. Slack is where the account team actually talks.

**The pain.** Before a QBR, a renewal, or any "where are we on this account?", an SE reconstructs the account by hand across four systems. Across an org that size it is roughly a day a week per rep spent assembling context instead of solving technical problems.

The sharper cost is the bottleneck. An AE or CSM who needs the current picture has to ask the SE and wait, so account knowledge moves at one person's calendar.

**Why an earlier attempt failed.** An in-house assistant was built and abandoned for one reason: it made things up. It produced fluent summaries that named competitors nobody had mentioned and asserted commitments nobody had made. **An unreliable copilot is worse than none**, because a wrong brief is acted on before it is checked.

That failure is the design constraint, not a footnote. Everything below exists to make ungrounded output structurally impossible rather than merely unlikely.

---

## 2. Current state and target state

### What stays, and why

| System | Stays where | Why |
| --- | --- | --- |
| **Salesforce** | Vantage's org | System of record for the deal. Steve reads it; it is never the copilot's to own. |
| **Activity warehouse** | Their AWS | Holds the raw signal. Sensitive, already governed, and their pipeline already models it. Replicating it would move the most sensitive data across a boundary for no gain. |
| **Linear** | Their workspace | Engineering's view of the account. Read live over its API. |
| **Slack** | Their workspace | Where the account team already is. Steve delivers there rather than asking people to visit somewhere new. |

**What moves to Vercel:** the copilot. It reads across the line and drafts. The only thing it writes anywhere is a brief posted into a Slack channel, on request. No system of record is ever written to.

The test a security team applies is "if this vendor vanished tomorrow, are we whole?" Under this design the answer is yes. Every system of record is untouched and complete; Vercel holds derived state only.

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
     Warehouse         Salesforce           Linear
     GONG- USG-        OPP- CON-            LIN-
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

**Two surfaces, two jobs.** Slack is the quick answer in the account channel, so an AE or CSM can self-serve without waiting on the SE. The web app is where the SE works: the evidence behind a brief, what the gate withheld, and a button to post it into the channel.

---

## 3. Vercel choices

Three headline picks, and two defaults they run on.

### eve: the agent layer

Durable sessions, typed read-only tools, the native Slack channel, and a run trace per turn. A brief is a multi-step tool loop that takes most of a minute; eve checkpoints each step, so a crash or a redeploy mid-run resumes rather than restarts.

*Trade-off:* eve is in public beta and its APIs may change before GA. Taken with eyes open, because the alternative is hand-rolling session durability, a Slack ack path and a tool harness, which are the parts most likely to be subtly wrong. The fallback is `WorkflowAgent` inside `'use workflow'`, keeping the gate and the Gateway.

### AI Gateway: model routing

One API and provider failover. In production there is no gateway key at all: the deployment authenticates with its Vercel OIDC token, so there is no provider credential in the environment to rotate or leak. Model choice is a runtime decision, and a brief routes to the stronger model while a follow-up in the thread routes to the faster one.

That split came from measuring the steps, not from preference. A brief's four model steps are wildly uneven, and the big one is composing the cited claims, which is also where quality matters most. A cheaper model on the small steps saves nothing; routing whole turns by intent does.

*Trade-off:* a heuristic decides intent, so it can misroute. It is deliberately biased toward the stronger model, because a wrong brief is visible to whoever asked and an over-provisioned question costs a fraction of a cent.

### Vercel Connect and OIDC: the credential plane

Steve authenticates to Slack and Linear through Connect. Tokens are minted per request, rotate server-side, and are revoked from a dashboard without a redeploy. **There is no Slack or Linear token in the environment.** It works both ways: the inbound channel takes its bot token from Connect on every webhook, and a brief posted from the web goes out on a Connect-minted app token.

The warehouse credential does not come from Connect, and that is a third mechanism rather than a gap. The deployment presents its Vercel OIDC token to Vault, which binds the role on the immutable owner and project claims plus the environment, and mints a Postgres role that expires. Nothing in the environment is a database password, and `/health/vault` reports the live lease.

*Trade-off, and it cost us a source:* Connect is beta and its connector types are not uniform. Linear's offers app-scoped tokens; Notion's is user-subject only and its grant did not survive a session boundary, so Notion is parked (§7).

### Substrate

**Fluid Compute** is the runtime, in `iad1`. Active-CPU billing suits a workload that spends most of its wall clock waiting on a model. Putting the functions in `iad1` also puts them in the same region as the warehouse, so the cross-account read is a same-region hop measuring in the tens of milliseconds. The boundary Steve crosses is a trust boundary, not a distance one.

**Cache Components** carries the read surfaces. Three routes prerender a static shell and stream their reads behind Suspense. The shell arrives in about 200ms, which is the difference between a blank page and a usable one while the reads land.

---

## 4. Working demo

**URL:** https://st-eve-v2.vercel.app

No login. Start at **/dashboard**, where a guided tour picks up a first-time visitor.

1. Open **/chat** and click **"Give me this week's brief for Northwind."**
2. Watch it read all three sources and return a cited brief. The tool calls are named on screen as they run, next to the model the Gateway routed the turn to.
3. Open **/accounts/ACC-2041** for the evidence behind that brief, what the gate withheld, and a **Post to Slack** button that puts the same card in the account channel.
4. Open **/integrations** for every source and the credential Steve presents to it, measured when the page loads.
5. Open **/health/vault** for the lease the running deployment is reading under, and **/health/boundary** for a live cross-boundary read.

Canned prompts on `/chat` each exercise a different path: the flagship brief, a follow-up that routes to the fast model, the live Linear read, and a second account.

**Crossing the boundary is real, and so is the credential.** `/health/boundary` reads the warehouse on every request. `/health/vault` reports the leased role and the seconds left on it, so the credential path is something a reviewer can check rather than take on trust.

---

## 5. Rollout plan

This is the process the repo is built under, not a proposal.

**The infrastructure is code, and so is the boundary.** Two Terraform configurations, both with state in HCP Terraform. One manages the RDS instance and its security group, adopted into state by import rather than recreated, so the existing database came under management without a migration. The other manages the credential path: the database secrets mount, the connection, the read-only role and its TTL, the JWT auth backend pointed at Vercel's OIDC issuer, and separate claim-bound roles for production and preview.

That matters more than tidiness, because the trust boundary is now a diff. Who can mint a warehouse credential, under which claims, for how long, is four resources rather than the state of a console somebody clicked. A security reviewer reads the change, not the outcome.

Writing the policy down surfaced the binding that matters. Vercel signs every tenant's OIDC token with the same key — the same `kid` is served under the global issuer and under every team issuer — so a valid signature proves only that Vercel issued the token to somebody, never to whom. Under the global issuer, `iss` is identical for every customer and binding it is not a tenancy check at all; a team issuer does name the team, but through a slug Vercel rewrites on rename. So the roles bind on `owner_id` and `project_id`, which are immutable, and treat the issuer as a check on a mutable string rather than the boundary itself.

**Preview.** Every push gets a preview deployment against the same database, under a separate Vault role bound to the preview environment with a shorter TTL. Worth being precise about what that does not buy: both roles read the same instance, so it separates credentials rather than data.

**Validation.** CI is a required status check: typecheck, tests, and a production build. It is hermetic, with no network and no database, so it never goes red because a provider had a bad minute.

**Canary.** Rolling Releases at the project level, promoting by percentage with the grounding eval as the gate.

**Cutover and rollback.** Merge to `main` deploys production, and a bad release is an alias flip back to the previous deployment. Seconds, no rebuild.

The gap worth naming: a green test suite is not a green deployment. CI is hermetic by design, which keeps it from failing on a provider's bad minute but also means it cannot catch a failure that only occurs at deploy time. Preview deployments close that gap, which is why promotion requires a verified preview and not just a passing build.

---

## 6. Success measures

### Technical

| Measure | Source | Target |
| --- | --- | --- |
| Grounded claim rate | `brief_runs`, grounded versus dropped | 100% of shipped claims cited, by construction |
| Withheld claims per brief | `citations` where `status = dropped` | Tracked, not minimised. A rising number means the model is reaching, not that the product is worse |
| Boundary latency | `/health/boundary` | Tens of milliseconds, same-region |
| Brief latency | Turn start to completion | Under 60s |

### Business

| Measure | Baseline | How it is read |
| --- | --- | --- |
| SE hours reclaimed | ~1 day/week/rep on reporting | Briefs run per SE per week against time previously spent assembling |
| Time to an account answer | Hours, gated on SE availability | Minutes, self-served in the account channel |
| Briefs self-served by non-SEs | Zero | Share of Slack briefs requested by AEs, CSMs and support |

That last one is the real measure. It is the difference between making the SE faster and removing them from the critical path.

---

## 7. Known limitations and risks

**This is a demo deployment, and it is scoped like one.** It runs on real infrastructure with real credentials against a seeded dataset, for a single tenant, on an unadvertised URL. A production offering carries a hardening pass this does not: authentication in front of every surface, network isolation for the database, certificate pinning, and the credential model extended to cover every store rather than the one holding customer data. Those are known and scoped rather than discovered, and none of them change the architecture above.

What follows is what I would tell the customer before kickoff, because these are the parts that would still be true after that pass.

**Salesforce is mocked.** It is a separate schema inside the same warehouse database, read through an adapter that treats it as a distinct system, so the isolation is a schema boundary rather than a trust boundary. The swap to a real org is one driver behind that seam. **"Steve reads a live Salesforce" would be false today** and I would not say it.

**Notion is not integrated.** Its Connect connector is user-subject only, and the grant did not survive a session boundary: the callback binds to the run that requested it, so the next session demanded a fresh handshake. As an MCP connection its authorization belongs to the runtime, so there was no seam to fail soft through, and three consecutive briefs produced nothing. Parked for Q4 as an authored tool that can degrade the way Linear's does.

**eve and Vercel Connect are both in public beta.** APIs may change before GA. This is early adoption with eyes open, and the fallback for each is named in §3.

**Preview is a single security principal, and that cannot be fixed here.** The Vercel OIDC token carries no deployment or branch claim, so every preview across every branch presents an identical claim set. Per-branch authorisation is structurally impossible with this token, not merely unimplemented.

**Sessions never end, and there is no retention policy.** An eve session is a durable Vercel Workflow. A turn finishes and the session parks, holding a continuation token so a follow-up resumes the same conversation with its full history. Nothing closes it.

Parked is not running, so there is no meaningful compute cost. The problem is retention, not spend: a parked session holds conversation history about a customer's accounts, and at 200 SEs those accumulate with no expiry. The intended policy is a short idle TTL after which a session ends and its history is discarded, and it is not implemented because the framework exposes no way to end a session. Cancelling a turn leaves the session accepting the next message. The only mechanism that would actually work is an out-of-band sweeper that ends the run; an application-level record of session age would stop new turns without ever driving the run terminal, which would look like a policy without being one.

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
| `lib/slack/brief-card.test.ts` | The brief renders inside Slack's block and character limits | CI |
| `lib/auth/scope.test.ts` | A principal cannot read outside the scope its channel granted | CI |
| `lib/model/config.test.ts` | Intent routing picks the intended model | CI |
| `evals/grounding.eval.ts` | A live agent run cites real record ids | Against a deployed target |
| `/health/vault` | Production reads the warehouse under a lease, and names the lease that did it | Live, every request |

**Two of those guard failures that types cannot catch.**

The example-id guard asserts that every citation id named in the agent's instructions resolves to a real seeded record. A prompt is prose, so it does not typecheck: if the data changes underneath it, the model can be taught to produce ids that will never resolve, and nothing in a normal build would notice.

The Slack card is rendered through eve's actual card renderer against a real brief rather than a hand-written fixture. A fixture asserts the shape its author expected; rendering the genuine artifact asserts the shape the system actually produces.

**The honest limit.** On a well-instructed model over clean data, the gate has nothing to catch: a live run withheld zero claims even when asked a leading question designed to invite an unbacked competitor name. The gate is a backstop, not a party trick. Its value is deterministic proof under the fixture tests, and the fact that on the day the model does reach, the reach does not ship.
