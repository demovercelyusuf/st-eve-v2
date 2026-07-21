import { EvidenceFocus } from "@/app/_components/evidence-focus";
import type { EvidenceRow, EvidenceSource, SourceStatus } from "@/lib/account/timeline";

// Everything Steve can cite about an account, on one page, with the id it is cited by.
//
// The rule this section enforces is narrow and worth stating: if the grounding gate would accept an id
// as a citation, that id has a row here. A brief that cites a record the evidence surface cannot show
// is a broken promise, and it is broken silently, which is worse than an error.

const SOURCE_STYLE: Record<EvidenceSource, string> = {
  warehouse: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  salesforce: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  linear: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function SourceChip({ row }: { readonly row: EvidenceRow }) {
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 font-medium text-[11px] ${SOURCE_STYLE[row.source]}`}
    >
      {row.kind}
    </span>
  );
}

// What was read and what was not, said out loud. A timeline that quietly omits a source reads as an
// account with no engineering work, and an SE would act on that. This is the page's version of the
// sentence the read tool returns when a grant is missing.
function Coverage({ sources }: { readonly sources: SourceStatus[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {sources.map((s) => (
        <span className="flex items-center gap-1.5" key={s.source}>
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${s.ok ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          <span className="text-muted-foreground">
            {s.label}
            {s.ok ? ` ${s.count}` : " unavailable"}
          </span>
        </span>
      ))}
    </div>
  );
}

function Notes({ sources }: { readonly sources: SourceStatus[] }) {
  const notes = sources.filter((s) => s.note);
  if (notes.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1">
      {notes.map((s) => (
        <li className="text-muted-foreground text-xs" key={s.source}>
          <span className={s.ok ? "" : "text-amber-700 dark:text-amber-400"}>{s.label}:</span>{" "}
          {s.note}
        </li>
      ))}
    </ul>
  );
}

function Row({ row }: { readonly row: EvidenceRow }) {
  return (
    <li
      // The citation id is the DOM id. That is the entire deep-link scheme: no mapping table, nothing
      // to keep in sync, and a citation that renders in Slack anchors on the web by construction.
      // scroll-mt keeps the row clear of the top of the viewport when the browser lands on it.
      className="scroll-mt-20 rounded-lg border border-border bg-card px-4 py-3 target:border-amber-500/60 target:bg-amber-500/5 target:ring-1 target:ring-amber-500/30"
      id={row.citationId}
    >
      {/* Stacked on a phone, two columns from sm up.

          At 320 the row's content box is 238px and the fixed children — the source chip, the
          citation id and the timestamp — measure 301px between them. The title was the only thing
          able to shrink, so it was allocated zero width and spilled one word per line down six line
          boxes. Giving the timestamp its own line above returns the full width to the title, and
          letting the group wrap means the title drops below the chip and id rather than being
          crushed beside them. */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <SourceChip row={row} />
          <a
            // Self-linking so an SE can copy the citation's url straight from the row it names, which
            // is how a brief's citation gets shared into a thread without hand-building the fragment.
            className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs hover:text-foreground"
            href={`#${row.citationId}`}
          >
            {row.citationId}
          </a>
          {/* break-words because a title is not guaranteed to contain a space in a useful place,
              and an unbroken run is what puts a card into horizontal overflow. */}
          <span className="min-w-0 break-words font-medium text-sm">{row.title}</span>
        </div>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">{row.atLabel}</span>
      </div>

      {row.detail ? (
        // A clamp counts lines, not characters, so the same three lines are about 370 characters on
        // a desktop and about 100 on a phone. detail on a call row is the Gong transcript, which
        // runs to a median of 479, so the phone was showing roughly a quarter of the record. Five
        // lines narrow and three wide keeps the card compact without hiding most of the evidence.
        <p className="mt-1.5 line-clamp-5 text-muted-foreground text-sm sm:line-clamp-3">
          {row.detail}
        </p>
      ) : null}

      {row.flags.length > 0 || row.url ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {row.flags.map((flag) => (
            <span className="rounded-full border border-border px-2 py-0.5" key={flag}>
              {flag}
            </span>
          ))}
          {/* Only a live source has somewhere else to go. A warehouse or CRM id resolves on this
              page, so linking it out would be a link to nothing. */}
          {row.url ? (
            <a
              className="text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
              href={row.url}
              rel="noreferrer"
              target="_blank"
            >
              Open in Linear
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function EvidenceTimeline({
  linearConnected,
  rows,
  sources,
}: {
  readonly linearConnected: boolean;
  readonly rows: EvidenceRow[];
  readonly sources: SourceStatus[];
}) {
  // Two bands, one list. Record rows are the current state of a system and carry no honest date;
  // activity rows happened on one. Interleaving them would mean inventing a timestamp for a contact
  // and filing an opportunity under its forecast close date, months ahead of everything real.
  const record = rows.filter((r) => r.group === "record");
  const activity = rows.filter((r) => r.group === "activity");

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium text-sm">Evidence ({rows.length})</h2>
        <p className="text-muted-foreground text-xs">Every record Steve is allowed to cite</p>
      </div>
      <Coverage sources={sources} />
      <Notes sources={sources} />

      <div className="mt-4">
        <EvidenceFocus linearConnected={linearConnected} />

        {rows.length === 0 ? (
          <p className="rounded-lg border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
            No source returned a record for this account.
          </p>
        ) : null}

        {record.length > 0 ? (
          <>
            <h3 className="text-muted-foreground text-xs uppercase tracking-wide">On the record</h3>
            <ol className="mt-2 flex flex-col gap-2">
              {record.map((row) => (
                <Row key={row.citationId} row={row} />
              ))}
            </ol>
          </>
        ) : null}

        {activity.length > 0 ? (
          <>
            <h3 className="mt-6 text-muted-foreground text-xs uppercase tracking-wide">
              What happened
            </h3>
            <ol className="mt-2 flex flex-col gap-2">
              {activity.map((row) => (
                <Row key={row.citationId} row={row} />
              ))}
            </ol>
          </>
        ) : null}
      </div>
    </section>
  );
}
