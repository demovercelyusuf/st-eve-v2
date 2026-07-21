import Link from "next/link";
import { FloatingMascot, Rise } from "@/app/_components/motion";

// The front door, and nothing else.
//
// This was six scrolling sections explaining the product: the problem, the boundary, the steps, a
// sample brief. All of that is a deck now, presented by someone who can read the room, which is a
// better medium for it than a page nobody scrolls to the bottom of. What is left has one job, which
// is to say what this is and get you inside.
//
// One viewport, deliberately. The constraint is the design: the moment something is allowed below a
// fold, that space starts collecting paragraphs again.
//
// min-h-dvh rather than h-dvh with overflow hidden, and the difference matters in exactly one place.
// Measured, the content needs 566px of height with the mascot and 438px without it, so on every
// realistic viewport there is nothing to scroll and the page reads as a single screen. A landscape
// phone has around 330px, and clipping is the wrong failure there: it would hide the only button on
// the page. This degrades to a short scroll instead, which nobody will see and nobody is stuck in.
//
// It reads no data and ships as static HTML, and its entire motion budget is CSS, so there is no
// client bundle on the critical path. That is most of why this route can hold a perfect performance
// score, and it is worth defending as the page a reviewer loads first.
export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* The landing owns its own chrome rather than borrowing the workspace shell, so it reads as a
          product page and not as somewhere you are already signed in. */}
      <header className="flex shrink-0 items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-medium">
          <span aria-hidden className="inline-block size-2 rounded-full bg-emerald-500" />
          Steve
          {/* The version, stated rather than implied. This is a second pass at the idea and the
              build is better for having had a first one, so there is nothing to be coy about. */}
          <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            v2
          </span>
        </span>
        <Link
          className="press rounded-md bg-primary px-3.5 py-2 font-medium text-primary-foreground text-sm"
          href="/dashboard"
        >
          Launch Steve
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-4 text-center">
        <Rise>
          <p className="flex items-center justify-center gap-2 font-medium text-muted-foreground text-sm">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-500" />
            The vercelian SE copilot
          </p>
        </Rise>

        <Rise delay={60}>
          <h1 className="mt-4 text-balance font-semibold text-4xl tracking-tight sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            Every claim carries the record that backs it.
          </h1>
        </Rise>

        <Rise delay={120}>
          <p className="mt-5 max-w-lg text-balance text-muted-foreground leading-relaxed sm:text-lg">
            Steve reads your warehouse, Salesforce and Linear, and hands you the brief. What is
            blocking, which record proves it, and what happens next.
          </p>
        </Rise>

        <Rise className="mt-8" delay={180}>
          <Link
            className="press inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground"
            href="/dashboard"
          >
            Launch Steve
            <span aria-hidden>&rarr;</span>
          </Link>
        </Rise>

        {/* Held back on short viewports rather than allowed to push the call to action off screen. A
            landscape phone has room for the sentence or the mascot, and the sentence is the one
            doing the work. */}
        <div className="mt-8 hidden [@media(min-height:700px)]:block">
          <FloatingMascot size={104} />
        </div>
      </main>

      <footer className="shrink-0 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center">
        <p className="text-muted-foreground text-xs">
          Grounded in the account&apos;s own records. Nothing it cannot cite gets shipped.
        </p>
      </footer>
    </div>
  );
}
