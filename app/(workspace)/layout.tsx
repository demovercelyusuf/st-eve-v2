import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/app/_components/app-shell";
import { CopilotDock } from "@/app/_components/copilot-dock";
import { CopilotProvider } from "@/app/_components/copilot-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

// Everything behind the front door renders inside the workspace chrome. The landing page sits
// outside this group on purpose: it has no sidebar, no skin picker and no nav, because its only job
// is to get you through it.
export default function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  return (
    // The copilot session is owned here rather than at the root. This layout stays mounted across
    // every route that has a copilot, so a turn streaming while someone clicks into an account is
    // not dropped, and the landing page outside this group ships none of it.
    <TooltipProvider>
      <CopilotProvider>
        <AppShell>{children}</AppShell>
        <Suspense fallback={null}>
          <CopilotDock />
        </Suspense>
      </CopilotProvider>
    </TooltipProvider>
  );
}
