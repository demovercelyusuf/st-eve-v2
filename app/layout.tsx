import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { CopilotDock } from "@/app/_components/copilot-dock";
import { CopilotProvider } from "@/app/_components/copilot-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
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

// metadataBase is what makes the open-graph image resolve to an absolute url. Without it a link to
// this deployment unfurls as nothing, which is most of what a reviewer sees before they open it.
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: {
    default: "Steve, the enterprise copilot for the technical win",
    // Per-page titles read as "Northwind Trading Co. · Steve" rather than each page repeating the
    // full product line, which is what a browser tab has room for.
    template: "%s · Steve",
  },
  description:
    "A grounded copilot for Solutions Engineers. It reads across Salesforce, an account-activity warehouse and Linear, and every claim it makes carries the record that backs it.",
  openGraph: {
    title: "Steve, the enterprise copilot for the technical win",
    description: "Every claim carries the record that backs it, or it does not ship.",
    type: "website",
  },
};

// The copilot is mounted here and nowhere else. eve's session lives in a ref inside the component
// that calls useEveAgent, so mounting it per page would start a new conversation on every navigation
// and drop any turn still streaming. The root layout is the only place the App Router keeps mounted
// across route changes, which makes it the only mount point where "available from anywhere" is true.
//
// The dock is a sibling of children rather than a wrapper around it: it renders fixed and floating,
// and nesting the whole app inside it would buy nothing. Both are client components under a static,
// prerendered layout, and neither reads request-time data, so the shell stays cacheable.
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, mono.variable)} lang="en" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint so the page never flashes the wrong skin. It has to
            be inline and render-blocking to run in time, which is why it is hand-written and tiny
            rather than imported. suppressHydrationWarning on html is the cost: the server cannot
            know the theme, so the attribute legitimately differs on the first client pass. */}
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: inline theme boot, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <TooltipProvider>
          <CopilotProvider>
            {children}
            <Suspense fallback={null}>
              <CopilotDock />
            </Suspense>
          </CopilotProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
