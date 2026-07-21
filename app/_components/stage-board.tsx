"use client";

import { CheckIcon, CopyIcon, RotateCcwIcon } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { RiskBadge } from "@/app/_components/badges";
import { fmtArr } from "@/lib/format";
import { STAGE_PATH, isClosed } from "@/lib/salesforce/stages";
import { cn } from "@/lib/utils";

// The stage board, and the one honest thing it has to get right.
//
// Salesforce is the customer's system of record for stage. Steve reads it and never writes to it:
// there is no write path in this codebase, and adding one is not a UI change. It is field-level
// permissions, validation rules, an opportunity-history trail, and a decision about which identity
// does the writing. So dragging a card here cannot mean "restage the opportunity", and there are only
// two other things it could honestly mean.
//
// The first is a proposal: queue the move, show it as pending, hand it to someone who can commit it.
// Rejected, because the thing that would commit it does not exist. A proposal UI with nothing behind
// it is the same lie as an optimistic write, with an extra screen in front of it.
//
// The second is what this is: a scenario. Dragging models the board, not the CRM. It answers the
// question an SE actually asks the day before a forecast call, which is "if I get Northwind through
// security review this week and Granite Peak lands, what does my commit look like". That question is
// worth answering and needs no write path to answer it, because the answer was always going to be
// pasted into a forecast doc by a human anyway.
//
// So the scenario is local, it is labelled as local in three places, every moved card keeps its real
// Salesforce stage visible underneath, it resets on reload, and the only way out of it is Copy, which
// produces text. Nothing here ever suggests it saved. That constraint is also what makes the feature
// defensible: it is a thinking tool, and thinking tools are allowed to be ephemeral.

export type StageCard = {
  accountId: string;
  name: string;
  stage: string;
  amount: number | null;
  closeDate: string | null;
  nextStep: string | null;
  riskFlag: string | null;
  openIssues: number | null;
};

// Closed Lost is appended rather than living in STAGE_PATH because the path is the route a deal takes
// when it works. It still needs a column: "what if this one goes away" is half of any scenario.
const COLUMNS: readonly string[] = [...STAGE_PATH, "Closed Lost"];

type Scenario = Record<string, string>;

function sumAmounts(cards: StageCard[]): number {
  return cards.reduce((total, c) => total + (c.amount ?? 0), 0);
}

function fmtDelta(n: number): string {
  return `${n > 0 ? "+" : "−"}${fmtArr(Math.abs(n))}`;
}

export function StageBoard({
  cards,
  engineeringConnected,
}: {
  cards: StageCard[];
  engineeringConnected: boolean;
}) {
  const [scenario, setScenario] = useState<Scenario>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const moves = Object.keys(scenario);
  const active = moves.length > 0;

  // Any stage present in the data but absent from the configured path still gets a column. An org
  // that added a stage should see its opportunities, not lose them off the side of the board.
  const stages = useMemo(() => {
    const extra = [...new Set(cards.map((c) => c.stage))].filter((s) => !COLUMNS.includes(s));
    return [...COLUMNS, ...extra.sort()];
  }, [cards]);

  // Two groupings, always. The scenario is what the board shows; the actual is what Salesforce says,
  // and it stays computed so every column can show the delta between the two rather than just the
  // new number. A scenario you cannot diff against the record is just a board you have scrambled.
  const { byStage, actualByStage } = useMemo(() => {
    const byStage = new Map<string, StageCard[]>();
    const actualByStage = new Map<string, StageCard[]>();
    for (const stage of stages) {
      byStage.set(stage, []);
      actualByStage.set(stage, []);
    }
    for (const card of cards) {
      byStage.get(scenario[card.accountId] ?? card.stage)?.push(card);
      actualByStage.get(card.stage)?.push(card);
    }
    return { byStage, actualByStage };
  }, [cards, scenario, stages]);

  function move(accountId: string, stage: string) {
    const card = cards.find((c) => c.accountId === accountId);
    if (!card) return;
    setScenario((s) => {
      const next = { ...s };
      // Dragging a card back to where Salesforce has it is not a move, it is an undo. Keeping it in
      // the map would leave the summary claiming a change that is not one.
      if (card.stage === stage) delete next[accountId];
      else next[accountId] = stage;
      return next;
    });
  }

  function drop(stage: string) {
    const id = dragging;
    setOver(null);
    setDragging(null);
    if (id) move(id, stage);
  }

  async function copySummary() {
    const lines = moves.map((id) => {
      const card = cards.find((c) => c.accountId === id);
      if (!card) return "";
      const value = card.amount ? ` (${fmtArr(card.amount)})` : "";
      return `${card.name}: ${card.stage} → ${scenario[id]}${value}`;
    });
    const won = byStage.get("Closed Won") ?? [];
    const wonActual = actualByStage.get("Closed Won") ?? [];
    const text = [
      "Stage scenario. Modelled locally, not saved to Salesforce.",
      "",
      ...lines.filter(Boolean),
      "",
      `Closed Won in this scenario: ${fmtArr(sumAmounts(won))} across ${won.length} ${won.length === 1 ? "opportunity" : "opportunities"}.`,
      `Salesforce today: ${fmtArr(sumAmounts(wonActual))} across ${wonActual.length}.`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_800);
    } catch {
      // Clipboard permission can be refused, and there is nothing useful to say about it. The board
      // is unaffected, so this stays silent rather than throwing a toast at someone mid-thought.
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mt-6">
        <div
          aria-live="polite"
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            active
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {active ? (
            <>
              <span className="font-medium">
                Scenario: {moves.length} {moves.length === 1 ? "move" : "moves"}
              </span>
              <span className="text-muted-foreground">
                Modelled on this screen only. Salesforce is unchanged, and a reload clears it.
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-foreground/5"
                  onClick={copySummary}
                  type="button"
                >
                  {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                  {copied ? "Copied" : "Copy summary"}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-foreground/5"
                  onClick={() => setScenario({})}
                  type="button"
                >
                  <RotateCcwIcon className="size-3.5" />
                  Reset
                </button>
              </div>
            </>
          ) : (
            <span>
              Drag a card to model a stage change. It is a what-if for your own forecast maths: Steve
              reads Salesforce and never writes to it, so nothing here leaves this screen.
            </span>
          )}
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-3">
            {stages.map((stage) => {
              const column = byStage.get(stage) ?? [];
              const actual = actualByStage.get(stage) ?? [];
              const value = sumAmounts(column);
              const delta = value - sumAmounts(actual);
              const isOver = over === stage;

              return (
                <section
                  aria-label={stage}
                  className={cn(
                    "flex w-72 shrink-0 flex-col rounded-xl border p-2 transition-colors",
                    isOver ? "border-foreground/30 bg-foreground/[0.04]" : "border-border bg-card/40",
                  )}
                  key={stage}
                  onDragLeave={() => setOver((s) => (s === stage ? null : s))}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    // Without preventDefault the browser refuses the drop outright. The guard on
                    // `dragging` keeps a file dragged in from the desktop from lighting up a column.
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setOver(stage);
                  }}
                  onDrop={() => drop(stage)}
                >
                  <header className="flex items-baseline justify-between gap-2 px-1.5 pt-1 pb-2">
                    <span className="font-medium text-sm">{stage}</span>
                    <span className="flex items-baseline gap-2 text-xs tabular-nums">
                      {delta !== 0 ? (
                        <span
                          className={cn(
                            "font-medium",
                            delta > 0
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {fmtDelta(delta)}
                        </span>
                      ) : null}
                      <span className="text-muted-foreground">
                        {value > 0 ? fmtArr(value) : ""} · {column.length}
                      </span>
                    </span>
                  </header>

                  <div className="flex flex-col gap-2">
                    {column.map((card) => (
                      <Card
                        card={card}
                        dragging={dragging === card.accountId}
                        engineeringConnected={engineeringConnected}
                        key={card.accountId}
                        onDragEnd={() => {
                          setDragging(null);
                          setOver(null);
                        }}
                        onDragStart={(e) => {
                          setDragging(card.accountId);
                          e.dataTransfer.effectAllowed = "move";
                          // Firefox will not start a drag at all unless some data is set.
                          e.dataTransfer.setData("text/plain", card.accountId);
                        }}
                        onMove={(next) => move(card.accountId, next)}
                        scenarioStage={scenario[card.accountId]}
                        stages={stages}
                      />
                    ))}

                    {column.length === 0 ? (
                      <p className="rounded-lg border border-border border-dashed px-2 py-6 text-center text-muted-foreground text-xs">
                        {dragging ? "Drop here" : "Nothing at this stage"}
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function Card({
  card,
  dragging,
  engineeringConnected,
  onDragEnd,
  onDragStart,
  onMove,
  scenarioStage,
  stages,
}: {
  card: StageCard;
  dragging: boolean;
  engineeringConnected: boolean;
  onDragEnd: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onMove: (stage: string) => void;
  scenarioStage: string | undefined;
  stages: readonly string[];
}) {
  const moved = scenarioStage !== undefined;

  return (
    // layoutId rather than layout, because a card that changes column unmounts from one parent and
    // mounts in another. Only layoutId survives that, and without it the card would teleport.
    //
    // The native drag handlers sit on the inner element rather than on motion.article because motion
    // redefines onDragStart for its own gesture system, and casting past that would be a lie about
    // which drag implementation is in play. Nesting keeps both honest, and it makes the browser's drag
    // ghost the card itself.
    <motion.article layoutId={card.accountId} transition={{ duration: 0.18, ease: "easeOut" }}>
      <div
        className={cn(
          "cursor-grab rounded-lg border bg-card p-3 active:cursor-grabbing",
          moved ? "border-amber-500/50" : "border-border",
          dragging && "opacity-40",
        )}
        draggable
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
      >
        <div className="flex items-start justify-between gap-2">
          {/* draggable={false} on the link, or the browser drags the href instead of the card. */}
          <Link
            className="truncate font-medium text-sm hover:underline"
            draggable={false}
            href={`/accounts/${card.accountId}`}
          >
            {card.name}
          </Link>
          <RiskBadge risk={card.riskFlag} />
        </div>

        <div className="mt-1 text-muted-foreground text-xs">
          {card.amount ? fmtArr(card.amount) : "No amount"}
          {card.closeDate ? ` · close ${card.closeDate}` : ""}
        </div>

        {/* Engineering load, and the blank is deliberate. When Linear was not consulted every card
            shows nothing here rather than a zero, because a zero would read as "clean" on an account
            nobody checked. */}
        {engineeringConnected && card.openIssues ? (
          <div className="mt-1 text-muted-foreground text-xs">
            {card.openIssues} open engineering {card.openIssues === 1 ? "issue" : "issues"}
          </div>
        ) : null}

        {/* Keyed off the real stage, not the scenario one. Whether a next step is missing is a fact
            about the record, and a what-if does not get to resolve it. */}
        {!card.nextStep && !isClosed(card.stage) ? (
          <div className="mt-1 text-amber-700 text-xs dark:text-amber-400">Awaiting next step</div>
        ) : null}

        {moved ? (
          <div className="mt-2 flex items-center justify-between gap-2 border-amber-500/30 border-t pt-2 text-xs">
            <span className="truncate text-muted-foreground">
              Salesforce: <span className="text-foreground">{card.stage}</span>
            </span>
            <button
              className="shrink-0 text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => onMove(card.stage)}
              type="button"
            >
              Undo
            </button>
          </div>
        ) : null}

        {/* The keyboard and touch path, not a decoration. HTML5 drag events never fire on touch and
            are unreachable without a pointer, so this select is the only route to the feature for a
            lot of people. It stays visible rather than hiding behind a hover, which would put it back
            out of reach of exactly the users who need it. */}
        <label className="mt-2 block">
          <span className="sr-only">Model {card.name} at a different stage</span>
          <select
            className="w-full rounded-md border border-border bg-background px-1.5 py-1 text-muted-foreground text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onChange={(e) => onMove(e.target.value)}
            value={scenarioStage ?? card.stage}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </motion.article>
  );
}
