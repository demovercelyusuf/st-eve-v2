import type { CSSProperties, ReactNode } from "react";

// Entrance motion for the landing page, as server components.
//
// These render a class name and a custom property, nothing else. Both stay server components, and
// there is no client bundle behind either: the animations are CSS keyframes declared in globals.css
// and driven by the compositor, so they start on first paint rather than waiting for hydration.
//
// The obvious alternative was the motion library that already ships for the chat surface, which is
// what would give us useReducedMotion and whileHover for free. It is the wrong trade here. The
// landing page is the first thing a reviewer loads and it reads no data, which means it is
// otherwise a fully static prerender with zero JavaScript. Paying a client runtime to fade a
// heading in would put a bundle on the one page whose entire job is arriving fast, and buy motion
// that cannot run until that bundle has parsed. prefers-reduced-motion is a media query, so CSS
// honours it without a hook.

type RiseProps = {
  readonly as?: "div" | "section" | "li" | "span";
  readonly children: ReactNode;
  readonly className?: string;
  /** Stagger, in milliseconds. Kept small: past about 400ms a stagger reads as a page that is slow. */
  readonly delay?: number;
};

// Fade and rise on mount. For above-the-fold content, which should animate straight in on load
// rather than waiting on a scroll position it has already passed.
export function Rise({ as: Tag = "div", children, className, delay = 0 }: RiseProps) {
  return (
    <Tag className={className ? `rise ${className}` : "rise"} style={{ "--rise-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

// The same movement, tied to scroll position instead of to load, for everything below the fold.
//
// Browsers without animation-timeline ignore that one declaration and fall back to playing the
// animation on load, which for a section the reader has not reached yet is indistinguishable from
// it having always been there. That fallback is the reason this can ship unprefixed and without a
// feature query: both paths end with the content visible.
export function Reveal({ as: Tag = "div", children, className, delay = 0 }: RiseProps) {
  return (
    <Tag
      className={className ? `reveal ${className}` : "reveal"}
      style={{ "--rise-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
