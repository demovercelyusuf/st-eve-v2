import Link from "next/link";

type Tab = "patch" | "board" | "spend";

function cls(active: boolean): string {
  return active
    ? "rounded-md px-3 py-1.5 font-medium"
    : "rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground";
}

export function Nav({ active }: { active?: Tab }) {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-medium">
          <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
          Vantage Copilot
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/dashboard" className={cls(active === "patch")}>
            Patch
          </Link>
          <Link href="/board" className={cls(active === "board")}>
            Stages
          </Link>
          <Link href="/spend" className={cls(active === "spend")}>
            Spend
          </Link>
          <Link
            href="/chat"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground"
          >
            Open the copilot
          </Link>
        </nav>
      </div>
    </header>
  );
}
