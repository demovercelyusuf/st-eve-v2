import { Suspense } from "react";
import { BrandIcon, type BrandId } from "@/app/_components/brand-icon";
import { pingLinear } from "@/lib/linear/account-issues";
import { warehouseIdentity, warehouseQuery } from "@/lib/warehouse/client";

export const metadata = { title: "Integrations" };

// What Steve reads, and how it authenticates to each source.
//
// The connection method is the point of this page. Three different mechanisms, each chosen for what
// it is talking to, rather than one pattern applied everywhere and explained afterwards.
//
// Status is measured when the page loads rather than declared. A page claiming an integration is
// connected because someone typed that into an array is worth nothing, and this is the page where
// that would matter most. What is deliberately NOT shown is the credential itself: the leased role
// name and its remaining TTL are operational detail, and putting a live credential identifier on a
// screen anyone can open is the opposite of the point being made.
export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Integrations</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
          The systems Steve reads across, and how it authenticates to each. Checked when you load
          this page, not declared in configuration.
        </p>
      </header>

      <Suspense fallback={<IntegrationsSkeleton />}>
        <IntegrationList />
      </Suspense>
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" key={i} />
      ))}
    </div>
  );
}

type Status = "live" | "degraded" | "mocked" | "planned";
type Method = "connect" | "vault" | "direct" | "none";

const METHOD_LABEL: Record<Method, string> = {
  connect: "Vercel Connect",
  vault: "HashiCorp Vault",
  direct: "Direct connection",
  none: "Not connected",
};

const METHOD_TONE: Record<Method, string> = {
  connect: "border-foreground/20 bg-foreground/5 text-foreground",
  vault: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  direct: "border-border bg-secondary text-secondary-foreground",
  none: "border-dashed border-border bg-transparent text-muted-foreground",
};

function StatusDot({ status }: { status: Status }) {
  const tone =
    status === "live"
      ? "bg-emerald-500"
      : status === "degraded"
        ? "bg-amber-500"
        : status === "planned"
          ? "bg-transparent ring-1 ring-muted-foreground/50"
          : "bg-muted-foreground/50";
  return <span aria-hidden className={`inline-block size-2 rounded-full ${tone}`} />;
}

function Row({
  brand,
  method,
  name,
  status,
  statusLabel,
  what,
}: {
  brand: BrandId;
  method: Method;
  name: string;
  status: Status;
  statusLabel: string;
  what: string;
}) {
  return (
    <article
      className={`rounded-xl border border-border bg-card p-5 ${status === "planned" ? "opacity-70" : ""}`}
    >
      {/* The icon is pulled out of the wrapping group and the rest wraps inside its own box.

          ml-auto resolves per flex line, not per container, so once the name pushed the status pill
          onto a second line the pill kept its auto margin and shot to the right edge of that line on
          its own — with the icon stranded above it, alone. Below sm the pill just follows the text
          in reading order; from sm up it goes back to the right, where there is room for it. */}
      <div className="flex items-start gap-3">
        <BrandIcon brand={brand} className="size-6 shrink-0" />

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="font-semibold text-base">{name}</h2>

          {/* The mechanism, beside the name. Which credential path a source uses is the architectural
              claim this page is making, so it does not belong buried in body text. */}
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px] ${METHOD_TONE[method]}`}
          >
            {METHOD_LABEL[method]}
          </span>

          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs sm:ml-auto">
            <StatusDot status={status} />
            {statusLabel}
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-muted-foreground text-sm">{what}</p>
    </article>
  );
}

async function IntegrationList() {
  // Touch the warehouse first so the mode below reflects the credential that actually served a
  // query rather than an empty pool that has never connected.
  const [warehouse, linear] = await Promise.all([
    warehouseQuery<{ n: string }>(`select count(*)::text as n from activity.dim_account`)
      .then((r) => ({ ok: true as const, accounts: Number(r.rows[0]?.n ?? 0) }))
      .catch(() => ({ ok: false as const, accounts: 0 })),
    pingLinear().then(
      (connected) => ({ connected }),
      () => ({ connected: false }),
    ),
  ]);

  const onVault = warehouseIdentity().mode === "vault";

  return (
    <div className="mt-8 space-y-3">
      <Row
        brand="postgres"
        method={onVault ? "vault" : "direct"}
        name="Account-activity warehouse"
        status={warehouse.ok ? (onVault ? "live" : "degraded") : "degraded"}
        statusLabel={warehouse.ok ? `${warehouse.accounts} accounts` : "unreachable"}
        what="Postgres on Amazon RDS in the customer's own AWS account, us-east-1. Gong call transcripts and weekly product-usage rollups land here from their existing Fivetran and dbt pipeline. Steve only ever reads, with a role that expires within the hour."
      />

      <Row
        brand="salesforce"
        method={onVault ? "vault" : "direct"}
        name="Salesforce"
        status="mocked"
        statusLabel="mocked in RDS"
        what="Mocked for this demo as the sfdc schema inside the same RDS database as the warehouse, not a live Salesforce org. It is still reached through its own adapter, so swapping in a real org means pointing that adapter at SOQL and changing nothing else."
      />

      <Row
        brand="linear"
        method="connect"
        name="Linear"
        status={linear.connected ? "live" : "degraded"}
        statusLabel={linear.connected ? "connected" : "not connected"}
        what="What engineering is holding against an account, read live over the network. It fails soft: if Linear is unreachable the brief ships without it rather than not at all. No Linear API key exists in the deployment."
      />

      <Row
        brand="slack"
        method="connect"
        name="Slack"
        status="live"
        statusLabel="reads and writes"
        what="Where the account team already works. Mention Steve in a channel and the brief lands in the thread; post a brief from the web and it lands in the same place. No Slack token exists in the deployment."
      />

      <Row
        brand="notion"
        method="none"
        name="Notion"
        status="planned"
        statusLabel="Q4"
        what="Account notes and the success plan, synced both ways. The connector exists and the read works, but Notion's grant is user-scoped and does not survive a session boundary, so it is parked rather than half shipped."
      />
    </div>
  );
}
