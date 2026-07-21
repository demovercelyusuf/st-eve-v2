import Link from "next/link";
import { FloatingMascot, Rise } from "@/app/_components/motion";
import { SlackPreview, SourceMarks } from "@/app/_components/slack-preview";
import { Wordmark } from "@/app/_components/wordmark";

// The front door, and nothing else.
//
// The copy is deliberately source-agnostic. An earlier version named the warehouse, Salesforce and
// Linear, which are this demo's seed data rather than the product: the claim is that it reads
// whatever an org already runs on, and naming three systems quietly shrinks that to three systems.
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
// Everything below the call to action is height-gated so it can never push the button off screen, so
// on any realistic viewport there is nothing to scroll and the page reads as a single screen. A
// landscape phone has around 330px, and clipping is the wrong failure there: it would hide the only
// button on the page. This degrades to a short scroll instead, which nobody will see.
//
// It reads no data and ships as static HTML, and its entire motion budget is CSS, so there is no
// client bundle on the critical path. That is most of why this route can hold a perfect performance
// score, and it is worth defending as the page a reviewer loads first.
export default function Page() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* The landing owns its own chrome rather than borrowing the workspace shell, so it reads as a
          product page and not as somewhere you are already signed in. */}
      <header className="flex shrink-0 items-center px-6 py-5">
        <span className="flex items-center gap-2">
          <Wordmark />
          {/* The version, stated rather than implied. This is a second pass at the idea and the
              build is better for having had a first one, so there is nothing to be coy about. */}
          <span className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            v2
          </span>
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        {/* Steve introduces the page rather than trailing it. He is the thing people recognise
            across the app, so he belongs above the line that names what he is, not below the proof.
            Sized down from the old hero treatment because he now sits on top of the whole stack. */}
        <FloatingMascot size={92} />

        <Rise className="mt-5">
          <p className="flex items-center justify-center gap-2 font-medium text-muted-foreground text-sm">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-emerald-500" />
            The vercelian copilot for the technical win
          </p>
        </Rise>

        <Rise delay={60}>
          <h1 className="mt-4 text-balance font-semibold text-4xl tracking-tight sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            Accelerate the technical win.
          </h1>
        </Rise>

        <Rise delay={120}>
          <p className="mt-5 max-w-lg text-balance text-muted-foreground leading-relaxed sm:text-lg">
            Full visibility into the technical progress of every account your team is
            responsible for.
          </p>
        </Rise>

        <Rise className="mt-8" delay={180}>
          {/* The only way in, and prefetched. The workspace carries the copilot runtime, which this
              page deliberately does not load, so this is the one navigation worth paying for early.
              A second copy in the header was redundant next to a button this size. */}
          <Link
            className="press inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground"
            href="/dashboard"
            prefetch
          >
            Launch Steve
            <span aria-hidden>&rarr;</span>
          </Link>
        </Rise>

        {/* The sources, then the thing they produce. Both are held back on short viewports rather
            than allowed to push the call to action off screen: a landscape phone has room for the
            sentence or the proof, and the sentence is the one doing the work.

            Two thresholds because they cost different amounts of height. The marks are one row and
            appear early; the card is the real artifact and only shows where there is genuinely room
            for it, which is now higher because the mascot sits above the fold rather than below it. */}
        <Rise className="mt-8 hidden [@media(min-height:660px)]:flex" delay={240}>
          <SourceMarks />
        </Rise>

        <Rise className="mt-7 hidden w-full justify-center [@media(min-height:900px)]:flex" delay={300}>
          <SlackPreview />
        </Rise>
      </main>
    </div>
  );
}
