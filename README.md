# Steve

The vercelian copilot for the technical win.

[![CI](https://github.com/demovercelyusuf/st-eve-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/demovercelyusuf/st-eve-v2/actions/workflows/ci.yml)

Full visibility into the technical progress of every account your team is responsible for. Steve reads
the systems an org already runs on, modern or legacy, and hands the account team a
brief: what is blocking, which record proves it, and what happens next.

Built for Solutions Engineers, Solutions Architects, technical directors, and anyone else on the
account team who currently has to ask an SE and wait.

Every claim carries the record id that backs it. Anything that cannot be grounded does not ship.

**Live demo:** https://st-eve-v2.vercel.app

**Solutions Architect submission:** [`docs/SUBMISSION.md`](docs/SUBMISSION.md) covers the problem, the
boundary, the Vercel choices and their trade-offs, the rollout plan, success measures, known
limitations, and how the AI behaviour is validated.

## The problem

Before every QBR, renewal, or "where are we on this account?", a Solutions Engineer rebuilds account
state by hand across several systems. Across a large SE org that is roughly a day a week per rep spent
assembling context instead of solving technical problems.

The sharper cost is the bottleneck. Anyone else who needs the current picture has to ask the SE, so
account knowledge moves at one person's calendar.

An earlier in-house attempt failed for one reason: it made things up. An unreliable copilot is worse
than none, because a wrong brief gets acted on before it gets checked.

## What it does

Ask for a brief on any account and the copilot:

1. Reads the account's history, its live deal record, and what engineering is holding against it.
2. Drafts a summary, prioritised next steps, and a stage read with a confidence level.
3. Runs a deterministic grounding gate that withholds any claim not backed by a real record id, and
   shows what it withheld.
4. Returns the cited brief, and can post it into the account's Slack channel.

## Architecture

The most important decision is the boundary. The customer's systems stay authoritative; only the
copilot moves to Vercel. In this deployment those systems are an account-activity warehouse on RDS, a
mocked Salesforce, and Linear, but nothing in the design assumes that set.

Three Vercel primitives carry it, and two defaults it runs on:

- **eve** for the agent: typed read-only tools, durable sessions that survive a crash or redeploy, and
  a run trace per turn.
- **AI Gateway** for model routing and cost, with provider failover, and no provider key in production.
- **Vercel Connect** and **OIDC** for credentials. Slack and Linear tokens are minted per request;
  the warehouse credential is a Vault-issued Postgres role that expires within the hour.
- **Fluid Compute** and **Cache Components** underneath.

The **grounding gate** is the core. It runs in code, after generation, so a confident-but-wrong claim
or a fabricated citation is caught rather than shipped.

## Surfaces

| Route | What |
| --- | --- |
| `/dashboard` | The SE's patch: risk, next steps, pipeline, and every account sortable and filterable. |
| `/accounts/[id]` | An account: opportunity, contacts, activity timeline, latest brief, post to Slack. |
| `/chat` | The copilot, with the model router beside it. |
| `/integrations` | Every source Steve reads, and the credential it presents to each. |
| `/health/boundary` | A live cross-boundary read that proves the connection is real. |
| `/health/vault` | The Vault lease the running deployment is reading under. |

## Where things live

```
agent/         The eve agent: instructions, per-turn model routing, the read tools, the emit_brief
               gate, and the Slack and web channels it answers on.
app/           The Next.js App Router surface: the landing page, the workspace routes, the components
               that render them, and the health and Slack API endpoints.
components/    Vendored UI. components/ui is shadcn primitives, components/ai-elements is the AI SDK
               chat parts. Dependencies checked into the repo, not code to read.
docs/          The Solutions Architect submission.
drizzle/       Generated SQL migrations for the app-store only, plus snapshots. Never hand-edited.
evals/         AI-behaviour checks that drive the real agent, as opposed to the deterministic unit
               tests in lib.
lib/           Everything that is not a route and not an agent tool.
public/        Static assets served as-is.
scripts/       Operator tasks run by hand: seed the warehouse, seed Linear, check the boundary and the
               Vault credential path from a laptop.
terraform/     The infrastructure the demo runs on. See terraform/README.md for apply order.
.github/       CI: typecheck, unit tests, build.
```

`lib/` is the biggest tree, so a second level:

```
lib/grounding, lib/citations, lib/evidence   The gate, and the two things that decide what an id is
                                             allowed to mean.
lib/brief                                    The brief's schema, and the shape both renderers agree on.
lib/warehouse, lib/salesforce, lib/linear    The three sources, each behind one adapter.
lib/vault, lib/db, lib/appstore              The credential path, the shared pool config, and the
                                             copilot's own derived state.
lib/auth                                     Who is asking, and what that entitles them to read.
lib/seed                                     The demo patch, typed once and derived into every system.
```

## Start here

Reading order for someone with the repo open. About an hour.

1. This file, then `docs/SUBMISSION.md` sections 1 to 3. The boundary is what makes every later file
   make sense.
2. `lib/brief/schema.ts`. The output the product exists to produce.
3. `lib/grounding/gate.ts`. Pure, no framework, no database, and small enough to read whole. This is
   the core of the argument.
4. `lib/citations/registry.ts` and `lib/evidence/ledger.ts`. The gate asks whether an id is in the
   set; these decide how it gets in, which is where the failure modes live.
5. `agent/tools/emit_brief.ts`. Where the gate is enforced, and why running it inside a tool's execute
   makes it unbypassable rather than advisory.
6. `agent/instructions.md`, then `agent/agent.ts` and `lib/model/config.ts`.
7. `agent/tools/read_account_activity.ts`, `read_salesforce.ts`, `read_linear_issues.ts`. Linear last,
   because its header argues for hand-writing the tool rather than exposing the workspace over MCP.
8. `lib/vault/creds.ts`, `lib/warehouse/client.ts`, `lib/db/config.ts`. After the tools, because it
   answers the question the tools raise: that read just happened, so what authenticated it.
9. `terraform/README.md`, then `terraform/warehouse/`, then `terraform/vault/`.
10. `agent/channels/slack.ts` and `agent/channels/eve.ts`. Delivery, and identity.
11. `app/(workspace)/layout.tsx` and the routes under it. Last, because they render what the previous
    ten steps produce, and the caching decisions read as arbitrary until you know the read crosses a
    boundary.
12. `lib/grounding/gate.test.ts`, `lib/citations/registry.test.ts`, `evals/grounding.eval.ts`, then
    `/health/boundary` and `/health/vault` on the live deployment. The proof, in increasing order of
    cost to run.

## Local development

Prerequisites: Node 24+, pnpm, and a Postgres instance.

```bash
pnpm install
# point .env.local at your warehouse and app-store databases, then:
pnpm seed                       # load the demo accounts into the warehouse
pnpm dev                        # the Next.js app and read surfaces
pnpm exec eve dev --no-ui       # the agent runtime (HTTP API on :2000)
```

The agent needs a model credential: an `AI_GATEWAY_API_KEY`, or a Vercel OIDC token pulled with
`vercel link`. See `.env.example` for the full set.

## Deployment

Deploys to Vercel. Production authenticates to the AI Gateway with Vercel's OIDC, so no provider key
lives in the environment, and it mints its warehouse credential through Vault rather than holding a
standing one. `/health/vault` reports which of those two paths a running deployment is on.

## Validating the AI

Grounding is enforced in code, not left to the model:

- `lib/grounding/gate.test.ts` proves the gate withholds a claim with no citation and a claim citing a
  fabricated id. `lib/citations/registry.test.ts` proves no two source prefixes overlap, so an id
  cannot resolve against the wrong system. Both run in CI.
- Every run records its grounded-versus-dropped claim counts, so grounding is measurable per account.

## Stack

Next.js 16 (App Router), React 19, eve, the AI SDK, Postgres via `pg` and Drizzle, Terraform, Vault,
TypeScript, Tailwind.
