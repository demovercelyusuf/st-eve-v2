"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A short cross-fade between workspace routes.
//
// Partly this is polish and partly it is honest: a route here streams, so the moment you navigate
// there is a real gap while the shell paints and the data lands behind Suspense. Without a
// transition that gap reads as a stall. With one it reads as the page arriving, which is what is
// actually happening.
//
// Deliberately short and deliberately not a slide. 140ms is under the threshold where motion starts
// costing time rather than describing it, and anything with travel in it fights the streamed content
// appearing underneath.
//
// motion is already in the workspace bundle for the drawer, so this adds no new dependency to the
// route that carries it, and nothing at all to the landing page, which is outside this group.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate={{ opacity: 1 }}
        // No exit animation. Waiting for one before the next route mounts would add its duration to
        // every navigation, which is the opposite of the point.
        initial={{ opacity: 0 }}
        key={pathname}
        transition={{ duration: 0.14, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
