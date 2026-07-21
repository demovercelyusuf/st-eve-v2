import Link from "next/link";

const STAYS = [
  { name: "Salesforce", note: "the system of record" },
  { name: "Activity warehouse", note: "in your AWS us-east-1" },
  { name: "Slack", note: "where the team works" },
  { name: "Okta", note: "your identity" },
  { name: "Vault", note: "your secrets" },
];

const PRIMITIVES = [
  {
    name: "eve",
    note: "Durable agent sessions, typed read-only tools, and an auditable trace for every run.",
  },
  {
    name: "AI Gateway",
    note: "Automatic provider failover and per-run cost, so no single model can take it down.",
  },
  {
    name: "Fluid Compute",
    note: "The active-CPU runtime the agent streams on, idle-cheap and quick to wake.",
  },
];

const STEPS = [
  {
    title: "Ask in Slack",
    body: "Run /brief <account> where the team already works, or open the copilot here.",
  },
  {
    title: "Read across the boundary",
    body: "A durable session reads the warehouse for history and Salesforce for the live deal.",
  },
  {
    title: "Ground every claim",
    body: "The grounding gate drops anything it cannot cite to a real activity, and flags it for review.",
  },
  {
    title: "Post it back, on the record",
    body: "A cited, Salesforce-ready brief returns to the thread as a run you can open and inspect.",
  },
];

export default function Page() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-medium">
          <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
          Steve
        </span>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-muted-foreground transition hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="/chat"
            className="rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground transition hover:opacity-90"
          >
            Open the copilot
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-10 pb-14 sm:pt-16">
        <p className="font-medium text-muted-foreground text-sm uppercase tracking-wide">
          The enterprise copilot for the technical win
        </p>
        <h1 className="mt-3 max-w-3xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
          Reconstruct any account into a cited weekly brief in under two minutes.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          A grounded copilot for Solutions Engineers and Solutions Architects. It reads across your existing stack,
          drafts the brief, and cites every claim against a real activity. If a claim cannot be
          grounded, it does not ship.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
          <Link
            href="/chat"
            className="rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground text-sm transition hover:opacity-90"
          >
            Open the copilot
          </Link>
          <span className="text-muted-foreground text-sm">
            Or run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8em]">
              /brief Northwind
            </code>{" "}
            in Slack.
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="font-semibold text-2xl tracking-tight">
          Your systems stay. Only the copilot moves.
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The most important decision here is the boundary. Every system of record stays exactly
          where it is. The copilot only reads across the line and drafts.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Stays in your environment
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {STAYS.map((s) => (
                <li key={s.name} className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-card-foreground">{s.name}</span>
                  <span className="text-muted-foreground text-sm">{s.note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Moves to Vercel
            </p>
            <p className="mt-4 font-medium text-card-foreground">The copilot</p>
            <p className="mt-2 text-muted-foreground text-sm">
              It reads across the line and drafts. It never writes back. If it vanished tomorrow,
              every system of record is untouched, and raw data never leaves your environment.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="font-semibold text-2xl tracking-tight">Three primitives, one deployable</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PRIMITIVES.map((p) => (
            <div key={p.name} className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono font-medium text-card-foreground">{p.name}</p>
              <p className="mt-2 text-muted-foreground text-sm">{p.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="font-semibold text-2xl tracking-tight">How a brief happens</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-border bg-card p-5">
              <p className="font-mono text-muted-foreground text-sm">
                {String(i + 1).padStart(2, "0")}
              </p>
              <p className="mt-2 font-medium text-card-foreground">{step.title}</p>
              <p className="mt-1.5 text-muted-foreground text-sm">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-muted-foreground text-sm">
          Grounded, durable, and on the record. Every brief is a run you can open.
        </p>
      </footer>
    </main>
  );
}
