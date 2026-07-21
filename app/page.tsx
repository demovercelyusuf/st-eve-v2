import Link from "next/link";
import { Reveal, Rise } from "@/app/_components/motion";

// The public front door. One arc: the problem an SE actually has, the artifact that answers it,
// the boundary that makes the artifact safe to trust, and one way in.
//
// This page reads no data on purpose. Under cacheComponents every other route is a static shell
// with Suspense-wrapped children because it has a warehouse round trip to hide. This one has
// nothing to wait on, so it prerenders whole and ships as HTML. Keeping it that way is worth
// defending: it is the first thing a reviewer loads, and its entire motion budget is CSS (see
// _components/motion.tsx), so there is no client bundle on the critical path at all.

// What stalls a technical win. The framing the rest of the page depends on: none of these are
// commercial objections, and none of them are visible from the CRM alone.
const STALLS = [
  {
    title: "An unmet exit criterion",
    body: "The success plan has one line nobody has signed off, and it is not the pricing line.",
  },
  {
    title: "An unresolved defect",
    body: "A P2 raised during the pilot that engineering is tracking and the deal team has never read.",
  },
  {
    title: "An open security finding",
    body: "A review that runs past the quarter because the answer is spread across three systems.",
  },
  {
    title: "A performance ceiling",
    body: "A p95 that looks fine in the pilot and stops looking fine at their production volume.",
  },
] as const;

// The boundary, stated in full. Linear belongs here as much as Salesforce does: it is a third
// system of record, and leaving it off this list while reading it in production would make the one
// section whose whole job is honesty the least honest thing on the page.
const STAYS = [
  { name: "Salesforce", note: "the system of record for the deal" },
  { name: "Activity warehouse", note: "call notes and usage series, in your AWS us-east-1" },
  { name: "Linear", note: "what engineering is holding against the account" },
  { name: "Slack", note: "where the team already works" },
  { name: "Okta", note: "your identity" },
  { name: "Vault", note: "your secrets" },
] as const;

const STEPS = [
  {
    title: "Ask where the work happens",
    body: "Mention Steve in the account channel. The reply lands in a thread, so the follow-up continues in the same durable session instead of starting over.",
  },
  {
    title: "Read across the boundary",
    body: "One session reads the warehouse for history, Salesforce for the live deal, and Linear for the defects and blockers that never reach the CRM.",
  },
  {
    title: "Ground every claim",
    body: "The grounding gate drops anything it cannot cite to a real record, and flags whatever survives on thin evidence for review.",
  },
  {
    title: "Post it back, on the record",
    body: "A cited brief returns to the thread as a run you can open and inspect, claim by claim, down to the transcript line.",
  },
] as const;

const PRIMITIVES = [
  {
    name: "eve",
    note: "Durable agent sessions, typed read-only tools, and an auditable trace behind every run.",
  },
  {
    name: "AI Gateway",
    note: "One credential, and provider failover across anthropic, bedrock and vertex, so no single provider outage takes the copilot down.",
  },
  {
    name: "Fluid Compute",
    note: "The active-CPU runtime the agent streams on. Idle-cheap, and quick to wake.",
  },
] as const;

export default function Page() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* The landing owns its own chrome rather than borrowing the app Nav, so it reads as a
          product page and not as a workspace someone has already signed into. */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-medium">
          <span aria-hidden className="inline-block size-2 rounded-full bg-emerald-500" />
          Steve
        </span>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            className="rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground"
            href="/dashboard"
          >
            Your patch
          </Link>
          <Link
            className="press rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground"
            href="/chat"
          >
            Open the copilot
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-16 lg:pb-24">
        <div>
          <Rise>
            <p className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-500" />
              The enterprise copilot for the technical win
            </p>
          </Rise>

          <Rise delay={60}>
            <h1 className="mt-4 text-balance font-semibold text-4xl tracking-tight sm:text-5xl sm:leading-[1.05]">
              Deals stall on the technical win long before they stall on price.
            </h1>
          </Rise>

          <Rise delay={120}>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Steve reconstructs an account from your activity warehouse, Salesforce and Linear, then
              hands the Solutions Engineer the brief: what is blocking the technical win, which record
              proves it, and what happens next. Every claim carries its citation, or it does not ship.
            </p>
          </Rise>

          <Rise delay={180}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                className="press rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm"
                href="/chat"
              >
                Open the copilot
              </Link>
              <Link
                className="press rounded-md border border-border px-4 py-2.5 font-medium text-sm transition hover:border-foreground/20"
                href="/dashboard"
              >
                See a patch
              </Link>
            </div>
          </Rise>

          {/* The real interaction. Slash commands cannot reach this agent: the channel dispatches on
              app_mention and message.im, and a form-encoded slash post is parsed and then dropped
              with a bare 200. Printing one here would send every reviewer down a path that silently
              does nothing, which is a worse failure than no instruction at all. */}
          <Rise delay={240}>
            <figure className="mt-8 max-w-md rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground text-xs"
                >
                  PR
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed">
                    <span className="font-medium">Priya Raman</span>{" "}
                    <span className="text-muted-foreground text-xs">10:41</span>
                    <br />
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">@Steve</span>{" "}
                    <span className="font-mono text-[0.9em]">brief Northwind</span>
                  </p>
                </div>
              </div>
              <figcaption className="mt-3 border-border border-t pt-3 text-muted-foreground text-xs">
                In the account channel. The brief comes back in the thread, where the next question can
                continue in the same session.
              </figcaption>
            </figure>
          </Rise>
        </div>

        <Rise className="float" delay={300}>
          <BriefPreview />
        </Rise>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <h2 className="font-semibold text-2xl tracking-tight">What the deal is actually stuck on</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            A Solutions Engineer, a Solutions Architect and the technical leader on the other side are
            all working the same four failure modes. None of them are commercial, and none of them are
            legible from the CRM on its own.
          </p>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STALLS.map((s, i) => (
            <Reveal delay={i * 60} key={s.title}>
              <div className="lift h-full rounded-xl border border-border bg-card p-5">
                <p className="font-medium">{s.title}</p>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <h2 className="font-semibold text-2xl tracking-tight">
            Your systems stay. Only the copilot moves.
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The most consequential decision here is the boundary. Every system of record stays exactly
            where it is. The copilot reads across the line and drafts, and that is the whole of its
            authority.
          </p>
        </Reveal>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-xl border border-border bg-card p-5">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Stays where it is
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {STAYS.map((s) => (
                  <li className="flex items-baseline justify-between gap-4" key={s.name}>
                    <span className="font-medium text-card-foreground">{s.name}</span>
                    <span className="text-right text-muted-foreground text-sm">{s.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex h-full flex-col gap-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Moves to Vercel
                </p>
                <p className="mt-4 font-medium text-card-foreground">The copilot, and nothing else</p>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                  It reads and it drafts. It never writes back. If it disappeared tomorrow, every
                  system of record is untouched and no raw account data has moved.
                </p>
              </div>

              {/* Linear is the one source reached over the public network, so it gets said plainly
                  rather than folded into the list above and left to look like the others. */}
              <div className="rounded-xl border border-border border-dashed bg-card/50 p-5">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  One source is read live
                </p>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  Salesforce and the warehouse are read inside your environment on a leased,
                  read-only credential. Linear is read over the network on an app-scoped token, and
                  its scope is a label filter in the query rather than an instruction in the prompt.
                  If Linear is unreachable the brief still ships, marked as missing that source.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <h2 className="font-semibold text-2xl tracking-tight">How a brief happens</h2>
        </Reveal>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <Reveal as="li" delay={i * 60} key={step.title}>
              <div className="lift h-full rounded-xl border border-border bg-card p-5">
                <p className="font-mono text-muted-foreground text-sm">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 font-medium text-card-foreground">{step.title}</p>
                <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <Reveal>
          <h2 className="font-semibold text-2xl tracking-tight">Three primitives, one deployable</h2>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PRIMITIVES.map((p, i) => (
            <Reveal delay={i * 60} key={p.name}>
              <div className="lift h-full rounded-xl border border-border bg-card p-5">
                <p className="font-medium font-mono text-card-foreground">{p.name}</p>
                <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{p.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="mt-6 border-border border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="flex items-center gap-2 font-medium">
              <span aria-hidden className="inline-block size-2 rounded-full bg-emerald-500" />
              Steve
            </span>
            <p className="mt-2 text-muted-foreground text-sm">
              Grounded, durable, and on the record. Every brief is a run you can open.
            </p>
          </div>
          <p className="text-muted-foreground text-xs">
            Running on synthetic data. Every account, contact and transcript is fictional.
          </p>
        </div>
      </footer>
    </main>
  );
}

// A hand-authored brief in the shipped format, using the same grammar as the real BriefCard: the
// mono citation chip, the header rule, the next-step row. Illustrative content, not a generated
// run, which is why it lives here rather than reading the warehouse.
//
// It cites all three sources on purpose. The claim that Steve reads across a warehouse, a CRM and
// an issue tracker is the one a reviewer is most likely to discount, and one artifact showing
// GONG, USG, OPP and LIN chips side by side argues it faster than a paragraph.
function BriefPreview() {
  return (
    <article className="rounded-xl border border-border bg-card shadow-xl">
      <header className="border-border border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-base tracking-tight">Weekly brief: Northwind Trading Co.</h2>
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 text-xs dark:text-amber-400">
            At risk
          </span>
        </div>
        <p className="mt-0.5 text-muted-foreground text-xs">
          <span className="font-mono">ACC-NORTHWIND</span> · Technical Validation · 82% confidence
        </p>
      </header>

      <div className="space-y-4 px-4 py-4">
        <section>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Blocking the technical win
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            The production network standard forbids egress to public service endpoints, so the
            allow-listed NAT path the pilot runs on will not extend to prod. Engineering has the
            PrivateLink work open against eu-central-1.
            <Cites delay={520} ids={["GONG-1042", "LIN-412"]} />
          </p>
        </section>

        <section>
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Working in your favour
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Ingest has held above the pilot threshold four weeks running, and the exit criterion on
            throughput is already met.
            <Cites delay={700} ids={["USG-88", "OPP-3301"]} />
          </p>
        </section>

        <section className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Next</p>
          <p className="mt-1.5 text-sm leading-relaxed">
            PrivateLink endpoint in eu-central-1 plus a documented split-horizon DNS pattern, to
            Priya, Thursday.
          </p>
        </section>

        <p className="border-border border-t pt-3 text-muted-foreground text-xs">
          9 claims, 9 cited. 1 held back for review.
        </p>
      </div>
    </article>
  );
}

// Citation chips, staggered so they land after the claim they support has been read. The chip
// styling matches the real brief card so the preview is not quietly prettier than the product.
function Cites({ delay, ids }: { readonly delay: number; readonly ids: readonly string[] }) {
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {ids.map((id, i) => (
        <span
          className="cite-in rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
          key={id}
          style={{ "--rise-delay": `${delay + i * 110}ms` } as React.CSSProperties}
        >
          {id}
        </span>
      ))}
    </span>
  );
}
