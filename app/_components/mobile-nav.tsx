"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TourButton } from "./product-tour";
import { SidebarNav } from "./sidebar-nav";
import { Wordmark } from "./wordmark";

// The workspace nav below lg: a hamburger that opens a slide-out drawer. Above lg the fixed sidebar
// in the shell takes over and this renders nothing but the trigger, hidden.
//
// The accessibility here is the point rather than a garnish. A drawer that traps nothing, restores
// no focus and leaves the page scrolling underneath is the single most common way a mobile menu
// fails an audit, and it fails it for real users before it fails it for a score.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // The drawer is portalled to the body, and this gates that until after hydration so the server and
  // the first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    // Lock the page behind the drawer. Without this the background scrolls under your finger while
    // the drawer sits still, which reads as broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the drawer so a keyboard or screen reader user is actually in it, and keep Tab
    // inside while it is open.
    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      // Put focus back where it came from. Dropping it to the top of the document on close is
      // disorienting in exactly the situation where orientation matters most.
      triggerRef.current?.focus();
    };
  }, [open]);

  const duration = reduceMotion ? 0 : 0.2;

  return (
    <>
      <button
        aria-expanded={open}
        aria-label="Open menu"
        className="grid size-9 place-items-center rounded-lg text-foreground hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 lg:hidden"
        data-tour="nav"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
          <path
            d="M2 4.5h14M2 9h14M2 13.5h14"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      </button>

      {/* Portalled to the body, and this is load-bearing rather than tidiness.

          The shell header carries backdrop-blur-sm, and a backdrop-filter establishes a containing
          block for every fixed-position descendant. Rendered in place, this drawer is a descendant
          of that header, so `fixed inset-0` resolved against a 56px-tall box: the overlay measured
          320x55, and the nav links painted below the panel, over the page, with no background
          behind them. That is the entire mobile navigation on every route below lg.

          The blur stays — it is what the header is supposed to look like. The drawer leaves. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 lg:hidden"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration }}
              >
                <button
                  aria-label="Close menu"
                  className="absolute inset-0 size-full bg-black/40"
                  onClick={() => setOpen(false)}
                  tabIndex={-1}
                  type="button"
                />
                <motion.aside
                  animate={{ x: 0 }}
                  aria-label="Workspace"
                  aria-modal="true"
                  className="absolute inset-y-0 left-0 flex w-72 max-w-[82vw] flex-col border-border border-r bg-card p-4 shadow-2xl focus:outline-none"
                  exit={{ x: "-100%" }}
                  initial={{ x: "-100%" }}
                  ref={panelRef}
                  role="dialog"
                  tabIndex={-1}
                  transition={{ duration, ease: "easeOut", type: "tween" }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <Wordmark />
                    <button
                      aria-label="Close menu"
                      className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                      onClick={() => setOpen(false)}
                      type="button"
                    >
                      <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 16 16" width="16">
                        <path
                          d="M3 3l10 10M13 3L3 13"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.6"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="mb-2 px-3 font-semibold text-[11px] text-muted-foreground tracking-wide">
                    WORKSPACE
                  </p>
                  <SidebarNav onNavigate={() => setOpen(false)} />

                  {/* The header's copy of this is hidden below sm, and nothing ever clears the
                      tour-seen flag, so on the phone the demo is given from the tour was reachable
                      exactly once. Here it is reachable on the device it is demoed on. */}
                  <TourButton className="mt-4 w-full" onStart={() => setOpen(false)} />
                </motion.aside>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
