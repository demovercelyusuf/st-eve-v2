// Same reason as the dashboard's: a soft navigation has nothing to commit to without this, so the
// router holds the page you came from until the server render finishes.
export default function IntegrationsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Integrations</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
          The systems Steve reads across, and how it authenticates to each. Checked when you load
          this page, not declared in configuration.
        </p>
      </header>

      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" key={i} />
        ))}
      </div>
    </div>
  );
}
