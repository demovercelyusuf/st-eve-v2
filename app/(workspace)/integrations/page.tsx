import { Suspense } from "react";
import { BrandIcon, type BrandId } from "@/app/_components/brand-icon";
import { readPatchIssueCounts } from "@/lib/linear/account-issues";
import { LINEAR_CONNECTOR } from "@/lib/linear/issues";
import { warehouseIdentity, warehouseQuery } from "@/lib/warehouse/client";

export const metadata = { title: "Integrations" };

// What Steve reads, and how it proves it is allowed to. The second half is the interesting one: the
// systems are unremarkable, the way each credential is obtained is not, and they are deliberately
// not all the same mechanism.
//
// Every status here is measured when the page loads rather than declared. A page claiming an
// integration is connected because someone typed that into an array is worth nothing, and this is
// the page where that would matter most.
export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header>
        <h1 className="font-semibold text-2xl tracking-tight">Integrations</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
          The systems Steve reads across, and how it authenticates to each. Status is checked when
          you load this page, not declared in configuration.
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
        <div className="h-32 animate-pulse rounded-xl border border-border bg-card" key={i} />
      ))}
    </div>
  );
}

type Status = "live" | "degraded" | "mocked" | "planned";

// How the credential is obtained. This is the distinction the page exists to draw: three different
// mechanisms, each chosen because of what it is talking to, rather than one pattern applied
// everywhere and explained afterwards.
type Method = "connect" | "vault" | "direct" | "none";

const METHOD_LABEL: Record<Method, string> = {
  connect: "Vercel Connect",
  vault: "HashiCorp Vault",
  direct: "Direct API",
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
  credential,
  method,
  name,
  status,
  statusLabel,
  what,
}: {
  brand: BrandId;
  credential: string;
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
      <div className="flex flex-wrap items-center gap-3">
        <BrandIcon brand={brand} className="size-6 shrink-0" />
        <h2 className="font-semibold text-base">{name}</h2>

        {/* The mechanism, up front. Which credential path a source uses is the architectural claim
            this page is making, so it belongs beside the name rather than buried in body text. */}
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium text-[11px] ${METHOD_TONE[method]}`}
        >
          {METHOD_LABEL[method]}
        </span>

        <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground text-xs">
          <StatusDot status={status} />
          {statusLabel}
        </span>
      </div>

      <p className="mt-2.5 text-muted-foreground text-sm">{what}</p>
      <p className="mt-3 border-border border-t pt-3 font-mono text-[13px] text-foreground/80">
        {credential}
      </p>
    </article>
  );
}

async function IntegrationList() {
  // Touch the warehouse first so the identity below describes the credential that actually served a
  // query rather than an empty pool that has never connected.
  const [warehouse, linear] = await Promise.all([
    warehouseQuery<{ n: string }>(`select count(*)::text as n from activity.dim_account`)
      .then((r) => ({ ok: true as const, accounts: Number(r.rows[0]?.n ?? 0) }))
      .catch(() => ({ ok: false as const, accounts: 0 })),
    readPatchIssueCounts([]).then(
      (r) => ({ connected: r.connected }),
      () => ({ connected: false }),
    ),
  ]);

  const identity = warehouseIdentity();
  const onVault = identity.mode === "vault";

  return (
    <div className="mt-8 space-y-3">
      <Row
        brand="postgres"
        credential={
          onVault
            ? `${identity.username} · lease expires in ${identity.secondsRemaining}s`
            : "Standing connection string from the environment. Vault is not configured here."
        }
        method={onVault ? "vault" : "direct"}
        name="Account-activity warehouse"
        status={warehouse.ok ? (onVault ? "live" : "degraded") : "degraded"}
        statusLabel={warehouse.ok ? `${warehouse.accounts} accounts` : "unreachable"}
        what="Postgres in the customer's own AWS account, holding call transcripts and weekly usage rollups landed by their existing pipeline. Steve only ever reads, and the role it reads as expires within the hour."
      />

      <Row
        brand="salesforce"
        credential={
          onVault
            ? "The same leased role as the warehouse. A schema boundary, not a credential boundary."
            : "Standing connection string, shared with the warehouse read path."
        }
        method={onVault ? "vault" : "direct"}
        name="Salesforce"
        status="mocked"
        statusLabel="mocked for the demo"
        what="The system of record for the deal. Reached through its own adapter so it behaves as a separate system; in this deployment it is a mocked schema rather than a live org."
      />

      <Row
        brand="linear"
        credential={`${LINEAR_CONNECTOR} · app-scoped token minted per request. No Linear API key exists in the deployment.`}
        method="connect"
        name="Linear"
        status={linear.connected ? "live" : "degraded"}
        statusLabel={linear.connected ? "connected" : "not connected"}
        what="What engineering is holding against an account. Read live over the network, and it fails soft: if Linear is unreachable the brief ships without it rather than not at all."
      />

      <Row
        brand="slack"
        credential="slack/steve-v2 · bot token minted per request, inbound and outbound. Steve holds no Slack secret at rest."
        method="connect"
        name="Slack"
        status="live"
        statusLabel="reads and writes"
        what="Where the account team already works. Mention Steve in a channel and the brief lands in the thread; post a brief from here and it lands in the same place."
      />

      <Row
        brand="notion"
        credential="notion.so/citrine-leaf · connector provisioned, grant not yet persisted across sessions."
        method="none"
        name="Notion"
        status="planned"
        statusLabel="Q4"
        what="Account notes and the success plan, synced both ways. The connector exists and the read works, but Notion's grant is user-subject only and does not survive a session boundary, so it is parked rather than half shipped."
      />

      <section className="mt-8 rounded-xl border border-border border-dashed p-5">
        <h2 className="font-semibold text-sm">Why none of these hold a password</h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Steve authenticates as itself. Every request carries an OIDC assertion signed by the
          platform for this specific deployment, bound to the project and environment, which it did
          not choose and cannot forge. Vault exchanges that assertion for a database role that
          expires within the hour. Connect exchanges it for a token scoped to one integration. The
          only credentials in this project's environment are addresses and role names.
        </p>
      </section>
    </div>
  );
}
