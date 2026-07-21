import type { ReactNode } from "react";
import { AppShell } from "@/app/_components/app-shell";

// Everything behind the front door renders inside the workspace chrome. The landing page sits
// outside this group on purpose: it has no sidebar, no skin picker and no nav, because its only job
// is to get you through it.
export default function WorkspaceLayout({ children }: { readonly children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
