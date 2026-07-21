import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html className={cn(sans.variable, mono.variable)} lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
