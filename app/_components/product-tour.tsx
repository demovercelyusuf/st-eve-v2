"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A self-guided coach-mark tour. It spotlights part of the app, explains it, and lets you click
// through or leave. It runs itself once for a first-time visitor, so the product demos itself when
// nobody is driving, and replays from the "Take a tour" button.
//
// Targets are found by [data-tour="..."], so the tour does not care which component rendered them
// and a step survives a component being moved or rewritten.
//
// Three things this has to get right, all of which are easy to get wrong:
//
// 1. The spotlight is click-through. It is a box-shadow cut-out with pointer-events none, not a
//    scrim with a hole, so you can actually click the thing being pointed at. A tour that highlights
//    the theme picker and then swallows the click on it is worse than no tour.
// 2. It never locks scrolling. The target is scrolled into view once when a step opens, and after
//    that the spotlight just tracks it. Re-scrolling on every scroll event fights the user.
// 3. It waits for its target to exist. Every data page here is a static shell with Suspense-wrapped
//    children, so on a cold load the patch table is genuinely not in the DOM yet. A tour that
//    measures once and gives up points at nothing on exactly the load a first-time visitor gets.

export type TourStep = { target?: string; title: string; body: string };

const SEEN_KEY = "steve-tour-seen";
const START_EVENT = "steve:start-tour";
const CARD_WIDTH = 340;
const GAP = 12;

export const APP_TOUR: readonly TourStep[] = [
  {
    title: "This is Steve",
    body: "Your patch, and the copilot that works it with you. Sixty seconds, and you can leave whenever you like.",
  },
  {
    target: '[data-tour="kpis"]',
    title: "Where the patch stands",
    body: "What is at risk, what is still waiting on a next step, and what the pipeline is worth. Read from the warehouse and the CRM together.",
  },
  {
    target: '[data-tour="patch"]',
    title: "Every account on your patch",
    body: "Filter by stage, sort by any column, and open an account to see the evidence behind its risk read.",
  },
  {
    target: '[data-tour="nav"]',
    title: "Three surfaces",
    body: "Command Center is here. Copilot is the full conversation. Integrations shows every system Steve reads and the credential it presents to each.",
  },
  {
    target: '[data-tour="themes"]',
    title: "Four skins",
    body: "Click a swatch and the whole app re-skins on the spot. Go on, the tour will wait.",
  },
  {
    target: '[data-tour="dock"]',
    title: "Steve rides along",
    body: "Ask about any account from any page. You will see which model the gateway routed the turn to, and every tool it called before it answered.",
  },
  {
    title: "Open an account",
    body: "Watch Steve turn a timeline into a cited brief, and post it to the account channel. Every claim carries the record that backs it, or it does not ship.",
  },
] as const;

export function TourButton({
  className = "",
  onStart,
}: {
  className?: string;
  // The drawer renders one of these and needs to close itself before the tour starts, because it
  // holds body overflow hidden and the tour scrolls its targets into view.
  onStart?: () => void;
}) {
  return (
    <button
      className={`rounded-lg border border-border px-3 py-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${className}`}
      onClick={() => {
        onStart?.();
        window.dispatchEvent(new Event(START_EVENT));
      }}
      type="button"
    >
      Take a tour
    </button>
  );
}

// A selector can match twice: the nav exists as both a desktop sidebar and a mobile hamburger, and
// only one of them is rendered at a given width. Pick whichever is actually on screen.
function visibleTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  const all = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return all.find((el) => el.getBoundingClientRect().width > 0) ?? all[0] ?? null;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(value, hi));
}

export function ProductTour({ steps = APP_TOUR }: { steps?: readonly TourStep[] }) {
  // Only ever set true from an effect or a user event, so the portal never renders during SSR and
  // no separate mounted guard is needed.
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardHeight, setCardHeight] = useState(210);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const step = steps[index];

  const start = useCallback(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setIndex(0);
    setActive(true);
  }, []);

  const close = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode refuses storage. The tour still ran; it just will not remember that it did.
    }
    // Put focus back where it was. Dropping it to the top of the document is disorienting in
    // precisely the situation where somebody is least oriented.
    returnFocusRef.current?.focus?.();
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) {
        close();
        return i;
      }
      return i + 1;
    });
  }, [close, steps.length]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    window.addEventListener(START_EVENT, start);
    return () => window.removeEventListener(START_EVENT, start);
  }, [start]);

  // Runs itself once, for a first-time visitor only.
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) !== null;
    } catch {
      // If storage is unavailable, do not auto-start: a tour that reopens on every navigation
      // because it cannot remember itself is worse than one that never opens.
    }
    if (seen) return;
    const timer = setTimeout(() => {
      setIndex(0);
      setActive(true);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  const measure = useCallback(() => {
    const el = visibleTarget(step?.target);
    if (!el) {
      setRect((prev) => (prev === null ? prev : null));
      return false;
    }
    const next = el.getBoundingClientRect();
    setRect((prev) =>
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.height === next.height
        ? prev
        : next,
    );
    return true;
  }, [step]);

  // Bring the target into view once per step, then wait for it if it is not there yet.
  //
  // The waiting is the part that matters. A step pointing at Suspense-streamed content can open
  // before that content exists, so this retries on an interval and gives up after a couple of
  // seconds rather than either hanging or silently pointing at nothing.
  useEffect(() => {
    if (!active) return;

    let settled = false;
    const attach = () => {
      const el = visibleTarget(step?.target);
      if (!el) return false;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      measure();
      settled = true;
      return true;
    };

    if (!step?.target) {
      setRect(null);
      return;
    }

    if (!attach()) {
      const poll = setInterval(() => {
        if (attach()) clearInterval(poll);
      }, 120);
      const giveUp = setTimeout(() => clearInterval(poll), 2500);
      return () => {
        clearInterval(poll);
        clearTimeout(giveUp);
      };
    }

    // Re-measure as the smooth scroll settles.
    const t1 = setTimeout(measure, 260);
    const t2 = setTimeout(measure, 560);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      settled = settled;
    };
  }, [active, step, measure]);

  // Track the target while the user scrolls or resizes. Deliberately no auto-scroll here.
  useEffect(() => {
    if (!active) return;
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, back, close]);

  // Measured rather than assumed. A hardcoded card height is fine until a step has two more lines
  // of copy than the others and the card hangs off the bottom of the screen.
  useLayoutEffect(() => {
    if (!active || !cardRef.current) return;
    const h = cardRef.current.getBoundingClientRect().height;
    setCardHeight((prev) => (Math.abs(prev - h) < 2 ? prev : h));
  }, [active]);

  useEffect(() => {
    if (active) cardRef.current?.focus();
  }, [active, index]);

  if (!active || !step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(CARD_WIDTH, vw - 28);
  const pad = 8;

  let position: { left: number; top: number };
  if (rect) {
    const left = clamp(rect.left + rect.width / 2 - cardW / 2, 14, Math.max(14, vw - cardW - 14));
    const below = rect.bottom + GAP;
    const above = rect.top - GAP - cardHeight;
    const top = below + cardHeight < vh ? below : above > 0 ? above : vh - cardHeight - 20;
    position = { left, top: clamp(top, 14, Math.max(14, vh - cardHeight - 14)) };
  } else {
    position = { left: (vw - cardW) / 2, top: Math.max(20, (vh - cardHeight) / 2) };
  }

  const isLast = index === steps.length - 1;

  return createPortal(
    <div
      aria-label="Product tour"
      className="pointer-events-none fixed inset-0 z-[70]"
      role="dialog"
    >
      {rect ? (
        // The cut-out. Purely visual and click-through, so the page underneath stays scrollable and
        // the highlighted control stays clickable.
        <div
          style={{
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
            height: rect.height + pad * 2,
            left: rect.left - pad,
            pointerEvents: "none",
            position: "fixed",
            top: rect.top - pad,
            transition: "all 0.25s ease",
            width: rect.width + pad * 2,
          }}
        />
      ) : (
        // Intro and outro have nothing to point at, so the whole screen dims and clicking it leaves.
        <button
          aria-label="Skip tour"
          className="pointer-events-auto absolute inset-0 size-full bg-black/55"
          onClick={close}
          tabIndex={-1}
          type="button"
        />
      )}

      <div
        className="pointer-events-auto fixed z-[71] rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl focus:outline-none"
        ref={cardRef}
        style={{ ...position, transition: "left 0.2s ease, top 0.2s ease", width: cardW }}
        tabIndex={-1}
      >
        <button
          aria-label="Skip tour"
          className="absolute top-3 right-3 rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={close}
          type="button"
        >
          <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 16 16" width="14">
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.6"
            />
          </svg>
        </button>

        <p className="mb-1 font-semibold text-[11px] text-muted-foreground uppercase tracking-wide">
          Steve tour · {index + 1} of {steps.length}
        </p>
        <h2 className="font-semibold text-base">{step.title}</h2>
        <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{step.body}</p>

        <div className="mt-4 flex items-center gap-2">
          <div aria-hidden className="flex gap-1.5">
            {steps.map((s, n) => (
              <span
                className={`size-1.5 rounded-full ${n === index ? "bg-foreground" : "bg-border"}`}
                key={s.title}
              />
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {index > 0 ? (
              <button
                className="rounded px-2 py-1.5 text-muted-foreground text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={back}
                type="button"
              >
                Back
              </button>
            ) : null}
            {isLast ? null : (
              <button
                className="rounded px-2 py-1.5 text-muted-foreground text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                onClick={close}
                type="button"
              >
                Skip
              </button>
            )}
            <button
              className="press rounded-lg bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground text-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              onClick={next}
              type="button"
            >
              {isLast ? "Done" : index === 0 ? "Start" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
