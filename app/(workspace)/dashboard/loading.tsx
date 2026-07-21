// What the router commits to the moment you click Launch.
//
// Without this file, a client-side navigation into this route has nothing to render until the RSC
// payload arrives, so the browser stays on the page you came from for the whole server render.
// Measured from the landing page: 1801ms of sitting on the landing page for a 5 KB response, with
// every JS chunk already cached from the prefetch. The delay was never the bundle.
//
// Partial Prerendering solves this for a document request, where the static shell ships immediately
// and the reads stream in behind Suspense. It does nothing for a soft navigation, because the router
// holds the current page until it can commit the next one. loading.tsx is the boundary it commits to.
//
// The markup deliberately matches the real page's shell and its skeletons, so this is not a flash of
// something different followed by the page: it is the page, with its data still arriving.
export default function DashboardLoading() {
  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Your patch</h1>
          <p className="mt-1 text-muted-foreground text-sm">Reading the warehouse...</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div className="h-[86px] animate-pulse rounded-xl border border-border bg-card" key={i} />
          ))}
        </div>

        <div className="mt-6 h-9 animate-pulse rounded-md border border-border bg-card" />
        <div className="mt-3 h-[757px] animate-pulse rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
