# Steve

The enterprise copilot for the technical win.

[![CI](https://github.com/demovercelyusuf/st-eve-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/demovercelyusuf/st-eve-v2/actions/workflows/ci.yml)

A grounded copilot for Solutions Engineers, Solutions Architects and technical leaders. Ask it in
Slack and it reconstructs an account into a cited brief: where the evaluation actually stands, what is
technically blocked, and what to do next.

It runs on Vercel and reads across a boundary into three systems that stay where they are: an
account-activity warehouse in AWS (Gong call transcripts, weekly product usage), Salesforce for the
deal, and Linear for every issue engineering is carrying. Every claim carries the record id that backs
it, and anything that cannot be grounded does not ship.

**Live demo:** https://st-eve-v2.vercel.app

**Solutions Architect submission:** [`docs/SUBMISSION.md`](docs/SUBMISSION.md) covers the problem, the boundary, the Vercel choices and their trade-offs, the rollout plan, success measures, known limitations, and how the AI behaviour is validated.

## The problem

Before every QBR, renewal, or "where are we on this account?", a Solutions Engineer rebuilds account
state by hand across several systems, then writes the same conclusions into Salesforce and Slack. Across
a large SE org that is roughly a day a week per rep spent on reporting instead of solving. An earlier
in-house attempt failed for one reason: it made things up, and an unreliable copilot is worse than none.

## What it does

Ask for a brief on any account and the copilot:

1. Reads the account's activity history from the warehouse and its live record from Salesforce.
2. Drafts a Salesforce-ready summary, prioritized next steps, and a deal-stage read with a confidence level.
3. Runs a deterministic grounding gate that drops any claim not backed by a real activity id and
   surfaces it for review.
4. Returns the cited brief and records the run (model, cost, grounding) for audit.

## Architecture

The most important decision is the boundary. The customer's systems stay authoritative; only the copilot
moves to Vercel.

- **Stays:** Salesforce (system of record), the account-activity warehouse (Postgres in AWS us-east-1),
  Slack, Okta (identity), and Vault (secrets).
- **Moves:** the copilot, which reads across the line and drafts. It never writes back, and raw data
  never leaves the customer's environment.

Three Vercel primitives carry it:

- **eve** — the durable-agent framework: typed read-only tools, durable sessions that survive a crash or
  redeploy, and an auditable run trace.
- **AI Gateway** — provider failover and per-run cost, so no single provider can take it down.
- **Fluid Compute** — the active-CPU runtime the agent streams on.

The **grounding gate** is the core. Every claim carries the activity ids that back it; the gate resolves
them against the account's real activity and withholds anything unbacked. It runs in code, after
generation, so a confident-but-wrong claim or a hallucinated citation is caught rather than shipped.

## Surfaces

| Route | What |
| --- | --- |
| `/dashboard` | The SE's patch: at-risk, awaiting-next-step, and closed-won KPIs with per-account cards. |
| `/board` | Opportunities by Salesforce stage, with the copilot's grounded risk read. |
| `/accounts/[id]` | An account: opportunity, contacts, activity timeline, latest brief run. |
| `/chat` | The copilot. |
| `/spend` | Per-run cost, from the AI Gateway's own reported figures. |
| `/health/boundary` | A live cross-boundary read that proves the connection is real. |

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
`vercel link`.

## Deployment

Deploys to Vercel. The warehouse and app-store connection strings are project environment variables;
production authenticates to the AI Gateway with Vercel's OIDC, so no provider key lives in the repo. The
production path mints short-lived warehouse credentials through Vault rather than holding a standing one.

## Validating the AI

Grounding is enforced in code, not left to the model:

- `scripts/check-gate.ts` proves the gate withholds an unbacked inference and a fabricated citation.
- Every run records its grounded-versus-dropped claim counts, so grounding is measurable per account.

## Stack

Next.js 16 (App Router), React 19, eve, the AI SDK, Postgres via `pg` and Drizzle, TypeScript, Tailwind.
