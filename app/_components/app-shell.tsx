import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { MobileNav } from "./mobile-nav";
import { Wordmark } from "./wordmark";
import { ProductTour, TourButton } from "./product-tour";
import { PageTransition } from "./page-transition";
import { NavLinks, SidebarNav } from "./sidebar-nav";
import { ThemeSwitcher } from "./theme-switcher";

// The workspace chrome: a header carrying the wordmark and the skin picker, a sidebar on desktop, a
// drawer below it, and pages rendered into main.
//
// This reads no data and no cookies, which is what keeps it prerenderable. Every page inside it is
// a static shell with its own Suspense-wrapped children, so the chrome paints immediately and each
// page's warehouse round trip happens underneath it rather than in front of it. Putting anything
// request-shaped here, a session, a theme cookie, a user name, would opt the whole workspace out of
// that for the sake of one string.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-border border-b bg-card/80 px-4 backdrop-blur-sm lg:px-6">
        <div className="flex items-center gap-1.5">
          <MobileNav />
          <Link
            className="rounded-md focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            href="/dashboard"
          >
            <Wordmark />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Hidden on the narrowest screens: the tour still runs itself once for a first-time
              visitor there, and a replay button is not worth the header room on a phone. */}
          <TourButton className="hidden sm:inline-flex" />
          <div data-tour="themes">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden w-56 shrink-0 border-border border-r p-4 lg:block"
          data-tour="nav"
        >
          <p className="mb-2 px-3 font-semibold text-[11px] text-muted-foreground tracking-wide">
            WORKSPACE
          </p>
          {/* Falls back to the same links with nothing highlighted, so the prerendered HTML already
              contains a usable nav and only the current-page emphasis arrives late. */}
          <Suspense fallback={<NavLinks activeHref={null} />}>
            <SidebarNav />
          </Suspense>
        </aside>

        <main className="min-w-0 flex-1">
          {/* The fallback is the page itself, unanimated. PageTransition reads usePathname, which
              cannot appear in a prerendered tree, so without this the whole workspace drops out of
              the static shell to add a fade. The prerendered HTML carries the real content and the
              transition attaches on hydration, which is the only moment it can matter anyway. */}
          <Suspense fallback={children}>
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </main>
      </div>

      <ProductTour />
    </div>
  );
}
