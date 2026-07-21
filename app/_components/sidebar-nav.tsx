"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// One definition of the workspace, used by the sidebar on desktop and by the drawer on mobile. Two
// copies of this list is how a nav item gets added in one place and quietly goes missing in the
// other.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/chat", label: "Copilot" },
  { href: "/evidence", label: "Evidence" },
  { href: "/integrations", label: "Integrations" },
] as const;

// An account page is reached from the patch and belongs to it, so Command Center stays lit while you
// are inside one. Everything else matches its own subtree.
function isActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/accounts");
  return pathname.startsWith(href);
}

// The links are static and the highlight is not, so they are separated on purpose.
//
// usePathname is a dynamic client hook, and under Cache Components a component that calls one cannot
// be prerendered. Rendering the whole nav through it would drag the entire workspace chrome out of
// the static shell to decide which of four items is bold. Instead this presentational half renders
// with no active item and is what the prerender contains; the client half below fills in the
// highlight once it knows where it is. The nav is visible and clickable before that happens, which
// is the part a user cares about.
export function NavLinks({
  activeHref,
  onNavigate,
}: {
  activeHref?: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Workspace" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = activeHref === item.href;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={[
              "rounded-lg px-3 py-2.5 text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              active
                ? "bg-accent font-semibold text-accent-foreground"
                : "text-foreground hover:bg-accent/60",
            ].join(" ")}
            data-tour={`nav-${item.href.slice(1)}`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = NAV_ITEMS.find((item) => isActive(item.href, pathname))?.href ?? null;
  return <NavLinks activeHref={active} onNavigate={onNavigate} />;
}
