"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RiskBadge, StageBadge } from "@/app/_components/badges";
import { fmtArr } from "@/lib/format";
import { STAGE_PATH, isClosed, stagePosition } from "@/lib/salesforce/stages";
import { cn } from "@/lib/utils";

// The patch as a table rather than a card grid.
//
// The grid was fine for looking at an account and wrong for comparing them. Cards put every field in
// a different place on the screen, so answering "which of these has the most engineering load" meant
// reading twelve boxes in sequence and holding the numbers in your head. A table puts each field in a
// column, which is what makes a patch scannable and what makes sorting mean anything.
//
// Sorting and filtering are client side over the already-loaded patch, deliberately. The patch is a
// dozen or so rows that arrived in one query; round-tripping to the server to reorder them would add
// latency to a thing that should feel instant, and it would put sort state in the URL where it would
// outlive the reason anyone set it. If the patch ever gets big enough that this is wrong, the fix is
// server-side paging, and that is a different component.

export type PatchTableRow = {
  accountId: string;
  name: string;
  industry: string;
  segment: string | null;
  arr: number;
  stage: string | null;
  amount: number | null;
  closeDate: string | null;
  nextStep: string | null;
  riskFlag: string | null;
  activityCount: number;
  lastActivity: string | null;
  openIssues: number | null;
};

type SortKey = "name" | "risk" | "stage" | "value" | "activity" | "issues";
type SortDir = "asc" | "desc";

// At Risk first, then Commit, then unflagged. This is the order an SE wants on a Monday, so it is
// also the default the server query already returns rows in.
const RISK_RANK: Record<string, number> = { "At Risk": 0, Commit: 1 };
function riskRank(risk: string | null): number {
  return risk ? (RISK_RANK[risk] ?? 2) : 3;
}

// Unknown or absent stages sort to the end rather than to the front, which is what -1 from
// stagePosition would otherwise do. An account with no opportunity is not at the start of the
// pipeline, it is outside it.
function stageRank(stage: string | null): number {
  const at = stagePosition(stage);
  return at === -1 ? STAGE_PATH.length : at;
}

// Every comparator is genuinely ascending, and direction is applied once as a multiplier. The
// tempting shortcut is to write the numeric ones backwards so the first click shows the biggest
// number, but then the arrow points up while the column counts down, and the header is lying about
// what it did. Natural order lives here; which way a column opens lives in FIRST_DIR below.
const COMPARATORS: Record<SortKey, (a: PatchTableRow, b: PatchTableRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  risk: (a, b) => riskRank(a.riskFlag) - riskRank(b.riskFlag) || a.name.localeCompare(b.name),
  stage: (a, b) => stageRank(a.stage) - stageRank(b.stage) || a.name.localeCompare(b.name),
  value: (a, b) => (a.amount ?? 0) - (b.amount ?? 0),
  activity: (a, b) => a.activityCount - b.activityCount,
  // A null is "not consulted" rather than zero, but Linear answers for the whole patch or none of
  // it, so a mixed column cannot happen and there is nothing to tie-break. Treated as below zero so
  // the all-null case still sorts deterministically.
  issues: (a, b) => (a.openIssues ?? -1) - (b.openIssues ?? -1),
};

// Which direction a column opens in on first click. Text reads best smallest-first, quantities read
// best largest-first, and risk is already ordered most-urgent-first by riskRank.
const FIRST_DIR: Record<SortKey, SortDir> = {
  name: "asc",
  risk: "asc",
  stage: "asc",
  value: "desc",
  activity: "desc",
  issues: "desc",
};

export function PatchTable({
  engineeringComplete,
  engineeringConnected,
  rows,
}: {
  engineeringComplete: boolean;
  engineeringConnected: boolean;
  rows: PatchTableRow[];
}) {
  const [sort, setSort] = useState<{ dir: SortDir; key: SortKey }>({ dir: "asc", key: "risk" });
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [atRiskOnly, setAtRiskOnly] = useState(false);

  const stages = useMemo(
    () => [...new Set(rows.map((r) => r.stage).filter((s): s is string => s !== null))].sort(
      (a, b) => stageRank(a) - stageRank(b),
    ),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (atRiskOnly && r.riskFlag !== "At Risk") return false;
      if (stage !== "all" && r.stage !== stage) return false;
      if (!q) return true;
      return `${r.name} ${r.industry} ${r.segment ?? ""} ${r.nextStep ?? ""}`
        .toLowerCase()
        .includes(q);
    });
    // Sorted on a copy: mutating the prop array would reorder the server's data in place and make a
    // second render start from wherever the last one left it.
    const compare = COMPARATORS[sort.key];
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => factor * compare(a, b));
  }, [atRiskOnly, query, rows, sort, stage]);

  const total = visible.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const filtersOn = atRiskOnly || stage !== "all" || query.trim() !== "";

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key ? { dir: s.dir === "asc" ? "desc" : "asc", key } : { dir: FIRST_DIR[key], key },
    );
  }

  return (
    <div className="mt-6">
      {/* Explicitly stacked below 537px rather than left to wrap.

          The wrap point is not a round number: min-w-56 on the search box plus the select's 175px
          intrinsic width — set by the widest stage label — cannot share a line under 537px. The
          skeleton reserved one row's height, the real thing rendered two, and everything below it
          including the table jumped 44px when the data landed. Stating the threshold lets the
          skeleton match it exactly, which is the only way this shift goes to zero. */}
      <div className="flex flex-col gap-2 min-[537px]:flex-row min-[537px]:flex-wrap min-[537px]:items-center">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-md border border-border bg-card pr-3 pl-8 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter accounts and next steps"
            type="search"
            value={query}
          />
        </div>

        <label className="sr-only" htmlFor="patch-stage">
          Filter by stage
        </label>
        <select
          className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          id="patch-stage"
          onChange={(e) => setStage(e.target.value)}
          value={stage}
        >
          <option value="all">All stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          aria-pressed={atRiskOnly}
          className={cn(
            "h-9 rounded-md border px-3 font-medium text-sm transition-colors",
            atRiskOnly
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setAtRiskOnly((v) => !v)}
          type="button"
        >
          At risk
        </button>

        {filtersOn ? (
          <button
            className="h-9 px-2 text-muted-foreground text-sm hover:text-foreground"
            onClick={() => {
              setQuery("");
              setStage("all");
              setAtRiskOnly(false);
            }}
            type="button"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* max-h and overflow-auto rather than overflow-x-auto, because the sticky header was never
          sticking. `sticky top-0` resolves against the nearest scroll container, and setting
          overflow-x makes overflow-y compute to auto, so this wrapper was already the scrollport —
          one with no height, therefore never vertically scrollable, so the header tracked the page
          scroll 1:1 and left. Giving the wrapper a height makes it a real scrollport and the header
          pins to it, which matters most on a phone where you have scrolled sideways into a column
          whose label is the only thing telling you what it is. */}
      <div className="mt-3 max-h-[70dvh] overflow-auto rounded-xl border border-border">
        {/* The floor was a flat 52rem at every width, which on a 320px phone hid 577px of table
            behind a scroller with no affordance saying so — including the Risk badge that the
            At-risk count above is counting. It also bound at exactly the wrong moment going up:
            crossing to lg introduced the 224px sidebar and the Activity column in the same pixel, so
            the table overflowed by 116px at 1024 having been clean at 1023.

            Now the phone drops to the three columns it has room for, Activity waits for xl, and the
            only remaining floor is at xl where there is genuinely width to spend. Measured after:
            zero overflow at 390, 430, 768, 1023, 1140 and 1280, one pixel at 1024, and 70px at 320
            where three columns of real content simply do not fit and the scroller does its job. */}
        <table className="w-full text-sm xl:min-w-[54rem]">
          <thead className="sticky top-0 z-10 bg-muted/60 text-left backdrop-blur">
            <tr className="border-border border-b">
              <Th align="left" onSort={() => toggleSort("name")} sort={sort} sortKey="name">
                Account
              </Th>
              <Th align="left" onSort={() => toggleSort("risk")} sort={sort} sortKey="risk">
                Risk
              </Th>
              <Th
                align="left"
                className="hidden md:table-cell"
                onSort={() => toggleSort("stage")}
                sort={sort}
                sortKey="stage"
              >
                Stage
              </Th>
              <Th
                align="right"
                className="hidden md:table-cell"
                onSort={() => toggleSort("value")}
                sort={sort}
                sortKey="value"
              >
                Value
              </Th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Next step</th>
              <Th
                align="right"
                className="hidden xl:table-cell"
                onSort={() => toggleSort("activity")}
                sort={sort}
                sortKey="activity"
              >
                Activity
              </Th>
              <Th
                align="right"
                className="hidden md:table-cell"
                onSort={() => toggleSort("issues")}
                sort={sort}
                sortKey="issues"
              >
                Eng
              </Th>
            </tr>
          </thead>

          <tbody>
            {visible.map((r) => (
              <tr className="border-border border-b last:border-0 hover:bg-muted/40" key={r.accountId}>
                {/* line-clamp-1 rather than truncate, and the difference is what makes the phone
                    layout work at all. truncate sets white-space: nowrap, so a cell's min-content
                    becomes the width of the entire unbroken string — 220px for an account name —
                    and a table column cannot go below its min-content. That one declaration held
                    this column at 256px inside a 255px viewport, which put the Risk badge, the thing
                    the At-risk count is counting, off the right edge on every phone. Clamping to one
                    line instead drops min-content to the longest single word and still ellipsises.

                    block, because next/link renders an inline box and neither clamping nor
                    truncation applies to one. */}
                <td className="max-w-40 px-3 py-2.5 md:max-w-64">
                  <Link
                    className="block line-clamp-1 font-medium hover:underline"
                    href={`/accounts/${r.accountId}`}
                  >
                    {r.name}
                  </Link>
                  <div className="line-clamp-1 text-muted-foreground text-xs">
                    {r.industry}
                    {r.segment ? ` · ${r.segment}` : ""} · {fmtArr(r.arr)}
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <RiskBadge risk={r.riskFlag} />
                </td>

                <td className="hidden px-3 py-2.5 md:table-cell">
                  <StageBadge stage={r.stage} />
                  {r.closeDate ? (
                    <div className="mt-0.5 whitespace-nowrap text-muted-foreground text-xs">
                      close {r.closeDate}
                    </div>
                  ) : null}
                </td>

                <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums md:table-cell">
                  {r.amount ? fmtArr(r.amount) : <span className="text-muted-foreground">·</span>}
                </td>

                <td className="max-w-80 px-3 py-2.5">
                  {r.nextStep ? (
                    <span className="line-clamp-2 text-muted-foreground">{r.nextStep}</span>
                  ) : r.stage && !isClosed(r.stage) ? (
                    <span className="text-amber-700 dark:text-amber-400">Awaiting next step</span>
                  ) : (
                    <span className="text-muted-foreground">No open action</span>
                  )}
                </td>

                <td className="hidden whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground tabular-nums xl:table-cell">
                  {r.activityCount}
                  {r.lastActivity ? (
                    <div className="text-xs">last {r.lastActivity}</div>
                  ) : null}
                </td>

                {/* An unchecked account renders as a dash, never as a zero. Zero is a claim that
                    engineering has nothing open, and we have not earned it when Linear did not
                    answer. */}
                <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">
                  {r.openIssues === null ? (
                    <span className="text-muted-foreground" title="Linear was not consulted">
                      ·
                    </span>
                  ) : (
                    <span className={r.openIssues > 0 ? "font-medium" : "text-muted-foreground"}>
                      {r.openIssues}
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-muted-foreground" colSpan={7}>
                  No accounts match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>

          {visible.length > 0 ? (
            <tfoot>
              <tr className="border-border border-t bg-muted/40 text-muted-foreground text-xs">
                {/* The footer has to track the columns. Below md the Value column is not rendered,
                    so its total has nothing to sit under and both numbers share one cell instead. */}
                <td className="px-3 py-2 md:hidden" colSpan={3}>
                  {visible.length} of {rows.length} accounts · {fmtArr(total)}
                </td>

                <td className="hidden px-3 py-2 md:table-cell" colSpan={3}>
                  {visible.length} of {rows.length} accounts
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums md:table-cell">
                  {fmtArr(total)}
                </td>
                <td className="hidden md:table-cell" colSpan={3} />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* Coverage, stated rather than implied. A column of dashes with no explanation reads as a bug. */}
      {engineeringConnected ? (
        engineeringComplete ? null : (
          <p className="mt-2 text-muted-foreground text-xs">
            Engineering counts hit the query cap, so they are floors rather than totals.
          </p>
        )
      ) : (
        <p className="mt-2 text-muted-foreground text-xs">
          Linear was not consulted on this request, so engineering load is unknown rather than zero.
        </p>
      )}
    </div>
  );
}

function Th({
  align,
  children,
  className,
  onSort,
  sort,
  sortKey,
}: {
  align: "left" | "right";
  children: React.ReactNode;
  className?: string;
  onSort: () => void;
  sort: { dir: SortDir; key: SortKey };
  sortKey: SortKey;
}) {
  const on = sort.key === sortKey;
  const Icon = on ? (sort.dir === "asc" ? ArrowUpIcon : ArrowDownIcon) : ChevronsUpDownIcon;

  return (
    // aria-sort on the cell rather than a visual arrow alone, so the sort state is available to a
    // screen reader that never sees the icon.
    <th
      aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("font-medium", className)}
      scope="col"
    >
      <button
        className={cn(
          "flex w-full items-center gap-1 px-3 py-2 hover:text-foreground",
          align === "right" ? "justify-end" : "justify-start",
          on ? "text-foreground" : "text-muted-foreground",
        )}
        onClick={onSort}
        type="button"
      >
        {children}
        <Icon className="size-3.5 shrink-0 opacity-60" />
      </button>
    </th>
  );
}
