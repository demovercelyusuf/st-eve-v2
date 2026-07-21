import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { THEME_INIT_SCRIPT } from "@/lib/themes";
import { cn } from "@/lib/utils";
import "./globals.css";

const sans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

// The wordmark only. Geist is the right voice for the interface and the wrong one for a logo: it is
// deliberately neutral, and a neutral logo is not a logo. Space Grotesk set in caps with tight
// tracking gives the name some character without introducing a second typeface into the UI, because
// nothing else on the page is allowed to use it.
const display = Space_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

// Two things in this file are load-bearing and neither is obvious.
//
// THEME_INIT_SCRIPT goes in as a blocking inline script in the head. Everything about that looks like
// a mistake, and it is the only thing that works: the skin is chosen client-side, so anything
// deferred or bundled paints the wrong colours first and corrects them, which is worse than a slow
// paint. It is a few lines, it is inlined rather than fetched, and it runs before first paint.
//
// The copilot is deliberately NOT mounted here. See the note above RootLayout.
//
// metadataBase is what makes the open-graph image resolve to an absolute url. Without it a link to
// this deployment unfurls as nothing, which is most of what a reviewer sees before they open it.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: {
    default: "Steve, the copilot for the technical win",
    // Per-page titles read as "Northwind Trading Co. · Steve" rather than each page repeating the
    // full product line, which is what a browser tab has room for.
    template: "%s · Steve",
  },
  description:
    "Full visibility into the technical progress of every account your team is responsible for. Steve reads the systems your org already runs on, modern or legacy, and every claim it makes carries the record that backs it.",
  openGraph: {
    title: "Steve, the copilot for the technical win",
    description:
      "Full visibility into the technical progress of every account your team is responsible for.",
    type: "website",
  },
};

// Without viewportFit: "cover" the safe-area insets are all zero, and several places in this app
// already pad with env(safe-area-inset-bottom) on the assumption that they are not. That was a
// guard the code claimed and did not have: on a notched phone the composer and the dock sat under
// the home indicator, and the one bare env() usage collapsed to a literal zero.
//
// interactiveWidget resizes the layout when the software keyboard opens, which is what keeps a
// composer pinned to the bottom of a chat visible while you are typing into it.
export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

// The copilot is deliberately NOT mounted here. It lives in the workspace layout instead.
//
// It used to sit in this file, on the reasoning that the root layout is the only thing the App
// Router keeps mounted across route changes, so it was the only place a session could survive
// navigation. That reasoning is still correct and the conclusion was still wrong: it also meant
// eve's client runtime loaded on the landing page, which has no copilot on it and is the first
// thing a reviewer opens. Measured, that was 424 KiB of unused JavaScript and a 5.0s LCP on
// mobile.
//
// The workspace layout is mounted across every route that actually has a copilot, so the session
// survives exactly as well and the landing page ships static HTML.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, mono.variable, display.variable)} lang="en" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint so the page never flashes the wrong skin. It has to
            be inline and render-blocking to run in time, which is why it is hand-written and tiny
            rather than imported. suppressHydrationWarning on html is the cost: the server cannot
            know the theme, so the attribute legitimately differs on the first client pass. */}
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: inline theme boot, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
