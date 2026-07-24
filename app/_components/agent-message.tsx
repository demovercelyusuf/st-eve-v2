"use client";

import type {
  EveAuthorizationPart,
  EveDynamicToolPart,
  EveMessage,
  EveMessagePart,
} from "eve/react";
import {
  BrainIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  KeyRoundIcon,
  XCircleIcon,
} from "lucide-react";
import { BriefCard } from "@/app/_components/brief-card";
import { BriefPreview } from "@/app/_components/brief-preview";
import type { RenderableBrief } from "@/lib/brief/render";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// One eve message, rendered part by part: text, reasoning, tool calls, and the input requests a tool
// can raise mid-turn. Both chat surfaces route every part through here, so they cannot drift on what
// a tool call looks like; `compact` is the only thing that differs between them.
//
// The part worth knowing about is the interception. A result from emit_brief is not drawn as tool
// output, it is recognised and rendered as a BriefCard. That is why the brief reads as a document
// rather than as JSON.
//
// The recognition is structural rather than a type import, and that is deliberate: emit_brief can
// also return a refusal, for an unknown account or a caller with no access. A refusal has to fall
// through to the ordinary tool rendering instead of being drawn as an empty brief, and matching on
// shape is what makes that fall-through automatic.

export type AgentInputResponse = {
  readonly optionId?: string;
  readonly requestId: string;
  readonly text?: string;
};

type EveFilePart = Extract<EveMessagePart, { type: "file" }>;

export function AgentMessage({
  canRespond,
  compact = false,
  isStreaming,
  message,
  onInputResponses,
}: {
  readonly canRespond: boolean;
  /**
   * Renders for a narrow surface: the floating dock rather than the full page. Only the parts that
   * genuinely do not fit change shape, so both surfaces still route every tool part through this one
   * component and cannot drift on what a tool call looks like.
   */
  readonly compact?: boolean;
  readonly isStreaming: boolean;
  readonly message: EveMessage;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
}) {
  const lastTextIndex = message.parts.reduce(
    (last, part, index) => (part.type === "text" ? index : last),
    -1,
  );

  // The trailing part of a turn that is still running is the only part anything can still be
  // happening to. Everything above it has been overtaken: the model moved on and produced this.
  const lastPartIndex = message.parts.length - 1;
  const isAssistant = message.role === "assistant";

  // The work — the thinking and the tool calls — is folded into one collapsed disclosure per run, so
  // a turn that read nine records shows a single "Thought for a moment" line instead of nine cards,
  // and the reader gets the answer first. See buildSegments for what counts as work and what stays
  // in the open (the answer, the brief, and anything still waiting on the reader).
  const segments = buildSegments(message.parts);

  return (
    <Message
      data-optimistic={message.metadata?.optimistic ? "true" : undefined}
      from={message.role}
    >
      <MessageContent>
        {segments.map((segment) => {
          if (segment.kind === "content") {
            const { index, part } = segment;
            return (
              <AgentMessagePart
                canRespond={canRespond}
                compact={compact}
                key={partKey(part, index)}
                onInputResponses={onInputResponses}
                isLive={isStreaming && isAssistant && index === lastPartIndex}
                part={part}
                showCaret={isStreaming && isAssistant && index === lastTextIndex}
              />
            );
          }

          // The run is still live only while the turn's trailing part is one of its own — once the
          // answer starts streaming below, the work is done and the group settles to a static label.
          const live =
            isStreaming && isAssistant && segment.parts.some((p) => p.index === lastPartIndex);
          return (
            <WorkSegment
              canRespond={canRespond}
              compact={compact}
              key={`work:${segment.parts[0].index}`}
              live={live}
              onInputResponses={onInputResponses}
              parts={segment.parts}
            />
          );
        })}
      </MessageContent>
    </Message>
  );
}

type IndexedPart = { readonly index: number; readonly part: EveMessagePart };

type MessageSegment =
  | ({ readonly kind: "content" } & IndexedPart)
  | { readonly kind: "work"; readonly parts: IndexedPart[] };

// Splits a message into what the reader sees straight away and what folds into a "Thought for a
// moment" group. Work — reasoning and ordinary tool calls — accumulates into runs; anything else
// breaks the run and renders in the open. step-start carries nothing to draw and must not split a
// run, so a reasoning/tool/step-start/tool sequence still collapses as one.
function buildSegments(parts: readonly EveMessagePart[]): MessageSegment[] {
  const segments: MessageSegment[] = [];
  parts.forEach((part, index) => {
    if (part.type === "step-start") return;
    if (isWorkPart(part)) {
      const last = segments.at(-1);
      if (last?.kind === "work") {
        last.parts.push({ index, part });
      } else {
        segments.push({ kind: "work", parts: [{ index, part }] });
      }
      return;
    }
    segments.push({ index, kind: "content", part });
  });
  return segments;
}

// Work is what belongs behind the disclosure: the model's thinking, and the tool calls it makes to
// get to an answer. Two kinds of tool call are deliberately not work and stay in the open — a brief
// (the product itself, never a step toward it) and anything still waiting on the reader, because a
// prompt folded into a collapsed group is a prompt no one answers.
function isWorkPart(part: EveMessagePart): boolean {
  if (part.type === "reasoning") return true;
  if (part.type === "dynamic-tool") {
    return shippedBrief(part) === null && !awaitingUser(part);
  }
  return false;
}

// A tool call the reader has to act on before the turn can move: an approval it must grant, or an
// input request it hasn't answered yet. Once answered, it stops being actionable and is free to fold
// away with the rest of the work.
function awaitingUser(part: EveDynamicToolPart): boolean {
  if (part.state === "approval-requested") return true;
  const eve = part.toolMetadata?.eve;
  return eve?.inputRequest !== undefined && eve?.inputResponse === undefined;
}

function WorkSegment({
  canRespond,
  compact,
  live,
  onInputResponses,
  parts,
}: {
  readonly canRespond: boolean;
  readonly compact: boolean;
  /** The turn is still running and its trailing part belongs to this run. */
  readonly live: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly parts: readonly IndexedPart[];
}) {
  const toolCount = parts.reduce((n, { part }) => (part.type === "dynamic-tool" ? n + 1 : n), 0);

  // An empty reasoning step carries no text; inside the group it would only be a blank line, and the
  // group's own label already says the model thought. Drop those and disclose what is left.
  const disclosed = parts.filter(
    ({ part }) => !(part.type === "reasoning" && part.text.trim() === ""),
  );

  // The run was only an empty thought — nothing to expand into. Leave the inert marker (no chevron,
  // no dead click) rather than a disclosure that opens onto nothing.
  if (disclosed.length === 0) {
    return (
      <p className="not-prose mb-4 flex items-center gap-2 text-muted-foreground text-sm">
        <BrainIcon className="size-4" />
        Thought for a moment
      </p>
    );
  }

  return (
    <Collapsible className="group not-prose mb-4 w-full" defaultOpen={false}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
        <BrainIcon className="size-4 shrink-0" />
        {live ? (
          <Shimmer as="span" duration={1.5}>
            Working…
          </Shimmer>
        ) : (
          <span>
            Thought for a moment
            {toolCount > 0 ? (
              <span className="text-muted-foreground/70">
                {" · "}
                {toolCount} {toolCount === 1 ? "step" : "steps"}
              </span>
            ) : null}
          </span>
        )}
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 mt-3 ml-2 border-muted border-l pl-4 data-[state=closed]:animate-out data-[state=open]:animate-in">
        {disclosed.map(({ index, part }) => (
          <AgentMessagePart
            canRespond={canRespond}
            compact={compact}
            isLive={false}
            key={partKey(part, index)}
            onInputResponses={onInputResponses}
            part={part}
            showCaret={false}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function AgentMessagePart({
  canRespond,
  compact,
  isLive,
  onInputResponses,
  part,
  showCaret,
}: {
  readonly canRespond: boolean;
  readonly compact: boolean;
  /** This part is the trailing part of a turn that is still running. */
  readonly isLive: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveMessagePart;
  readonly showCaret: boolean;
}) {
  switch (part.type) {
    case "step-start":
      return null;
    case "text":
      return (
        <MessageResponse caret="block" isAnimating={showCaret}>
          {part.text}
        </MessageResponse>
      );
    case "reasoning": {
      // Open on the full page, where there is room to read it. In the dock an expanded reasoning
      // block would push the answer itself out of view, so it starts collapsed and stays available.
      //
      // Bounded by isLive rather than trusting part.state alone, and that is not belt and braces.
      // eve moves a reasoning part off "streaming" only when it receives reasoning.completed for
      // that step: turn.completed writes message metadata and nothing else, and turn.failed returns
      // the state untouched. So a single dropped event pins the part at "streaming" permanently, and
      // the block shimmers "Thinking..." under a finished brief for as long as the page is open.
      // A part with other parts after it, or a turn that has stopped, is not thinking by definition,
      // which is a fact this surface can establish on its own without waiting to be told.
      const isThinking = part.state === "streaming" && isLive;

      // A finished reasoning step routinely carries no visible text: the provider computes a thinking
      // duration but returns the reasoning itself redacted, or the step only routed to a tool. Left
      // to render through the normal block, that becomes a "Thought for 1 second" row whose chevron
      // opens onto nothing but the content block's top margin — a disclosure that reveals a blank
      // line, which reads as a broken control.
      //
      // Rather than drop it, leave a plain marker so the transcript still records that the model
      // paused — but a non-interactive one: no chevron, no hover affordance, nothing that invites a
      // click that can't pay off. The label stays duration-agnostic on purpose: the duration is
      // measured by the block that never rendered for a step restored on reload, so it isn't reliably
      // known here, and "a moment" is true either way. The live case keeps its "Thinking..." shimmer
      // above via the normal block, so this only ever stands in after the step has completed empty.
      if (!isThinking && part.text.trim() === "") {
        return (
          <p className="not-prose mb-4 flex items-center gap-2 text-muted-foreground text-sm">
            <BrainIcon className="size-4" />
            Thought for a moment
          </p>
        );
      }

      return (
        <Reasoning defaultOpen={!compact} isStreaming={isThinking}>
          <ReasoningTrigger />
          <ReasoningContent>{part.text}</ReasoningContent>
        </Reasoning>
      );
    }
    case "file":
      return <AttachmentPart part={part} />;
    case "authorization":
      return <AuthorizationPrompt part={part} />;
    case "dynamic-tool": {
      // emit_brief is the product's output, not a tool call to inspect. Rendering it as a collapsed
      // JSON blob put the flagship artifact behind a disclosure triangle on the surface where an SE
      // actually works, while Slack got a designed card of the same data.
      //
      // The dock gets the same brief at panel scale. See brief-preview.tsx for why the full card is
      // the wrong rendering in 26rem rather than simply a squeezed one.
      const brief = shippedBrief(part);
      if (brief) return compact ? <BriefPreview brief={brief} /> : <BriefCard brief={brief} />;

      return (
        <Tool
          defaultOpen={part.state === "approval-requested" || part.state === "approval-responded"}
        >
          <ToolHeader
            state={part.state}
            title={part.toolName}
            toolName={part.toolName}
            type="dynamic-tool"
          />
          <ToolContent>
            <ToolInput input={part.input} />
            <InputRequestActions
              canRespond={canRespond}
              part={part}
              onInputResponses={onInputResponses}
            />
            <ToolOutput errorText={part.errorText} output={part.output} />
          </ToolContent>
        </Tool>
      );
    }
  }
}

// Narrows a tool part to a shipped brief. Deliberately structural rather than a type import: the tool
// output crosses the wire as JSON, so what arrives is a shape to check, not a type to trust. A brief
// that did not ship (an unknown account, a caller with no access) falls through to the normal tool
// rendering, which is the right place for it.
function shippedBrief(part: EveDynamicToolPart): RenderableBrief | null {
  if (part.toolName !== "emit_brief" || part.state !== "output-available") return null;

  const output = part.output as Partial<RenderableBrief> & { shipped?: boolean };
  if (!output?.shipped || !output.grounding || !Array.isArray(output.nextSteps)) return null;

  return output as RenderableBrief;
}

function AttachmentPart({ part }: { readonly part: EveFilePart }) {
  const label = part.filename ?? "Attachment";
  const detail = [part.mediaType, formatBytes(part.size)].filter(Boolean).join(" - ");
  const isImage = part.mediaType.startsWith("image/") && part.url !== undefined;
  const Icon = isImage ? ImageIcon : FileIcon;
  const body = (
    <span className="flex max-w-sm items-center gap-3 rounded-md border bg-background/60 p-2 text-sm">
      {isImage ? (
        <img alt={label} className="size-12 shrink-0 rounded-sm object-cover" src={part.url} />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {detail ? <span className="block truncate text-muted-foreground">{detail}</span> : null}
      </span>
      {part.url ? <ExternalLinkIcon className="size-4 shrink-0 text-muted-foreground" /> : null}
    </span>
  );

  return part.url ? (
    <a href={part.url} rel="noreferrer" target="_blank">
      {body}
    </a>
  ) : (
    body
  );
}

function AuthorizationPrompt({ part }: { readonly part: EveAuthorizationPart }) {
  const isAuthorized = part.state === "completed" && part.outcome === "authorized";
  const isCompleted = part.state === "completed";
  const Icon = isAuthorized ? CheckCircleIcon : isCompleted ? XCircleIcon : KeyRoundIcon;
  const instructions = part.authorization?.instructions;
  const shouldShowInstructions = instructions !== undefined && instructions !== part.description;

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border p-3",
        isAuthorized
          ? "border-emerald-500/30 bg-emerald-500/5"
          : isCompleted
            ? "border-destructive/30 bg-destructive/5"
            : "border-blue-500/30 bg-blue-500/5",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            isAuthorized
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : isCompleted
                ? "bg-destructive/10 text-destructive"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium text-sm">{authorizationTitle(part)}</p>
          <p className="text-muted-foreground text-sm">{authorizationDescription(part)}</p>
          {shouldShowInstructions ? (
            <p className="text-muted-foreground text-sm">{instructions}</p>
          ) : null}
          {part.state === "required" && part.authorization?.userCode ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Code</span>
              <code className="rounded-md bg-background px-2 py-1 font-mono">
                {part.authorization.userCode}
              </code>
            </div>
          ) : null}
          {part.state === "required" && part.authorization?.url ? (
            <Button asChild size="sm">
              <a href={part.authorization.url} rel="noreferrer" target="_blank">
                <ExternalLinkIcon className="size-4" />
                Sign in with {part.displayName}
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function authorizationTitle(part: EveAuthorizationPart): string {
  if (part.state === "required") {
    return `Connect ${part.displayName}`;
  }
  if (part.outcome === "authorized") {
    return `${part.displayName} connected`;
  }
  return `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}`;
}

function authorizationDescription(part: EveAuthorizationPart): string {
  if (part.state === "required") {
    return part.description;
  }
  if (part.outcome === "authorized") {
    return `${part.displayName} connected.`;
  }
  const tail = part.reason !== undefined ? ` (${part.reason})` : "";
  return `${part.displayName} authorization ${formatAuthorizationOutcome(part.outcome)}${tail}.`;
}

function formatAuthorizationOutcome(outcome: NonNullable<EveAuthorizationPart["outcome"]>): string {
  switch (outcome) {
    case "authorized":
      return "authorized";
    case "declined":
      return "declined";
    case "failed":
      return "failed";
    case "timed-out":
      return "timed out";
  }
}

function formatBytes(size: number | undefined): string | undefined {
  if (size === undefined) {
    return undefined;
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function InputRequestActions({
  canRespond,
  onInputResponses,
  part,
}: {
  readonly canRespond: boolean;
  readonly onInputResponses: (responses: readonly AgentInputResponse[]) => void | Promise<void>;
  readonly part: EveDynamicToolPart;
}) {
  const inputRequest = part.toolMetadata?.eve?.inputRequest;
  if (!inputRequest) {
    return null;
  }

  const inputResponse = part.toolMetadata?.eve?.inputResponse;
  const selectedOption = inputRequest.options?.find(
    (option) => option.id === inputResponse?.optionId,
  );

  return (
    <div className="space-y-3 rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
      <p className="text-muted-foreground text-sm">{inputRequest.prompt}</p>
      {inputResponse ? (
        <p className="font-medium text-sm">
          Responded: {selectedOption?.label ?? inputResponse.text ?? inputResponse.optionId}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {inputRequest.options?.map((option) => (
            <Button
              disabled={!canRespond}
              key={option.id}
              onClick={() => {
                void onInputResponses([
                  {
                    optionId: option.id,
                    requestId: inputRequest.requestId,
                  },
                ]);
              }}
              size="sm"
              type="button"
              variant={option.style === "danger" ? "destructive" : "default"}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function partKey(part: EveMessagePart, index: number): string {
  switch (part.type) {
    case "authorization":
      return `authorization:${part.turnId}:${part.stepIndex}:${part.name}`;
    case "dynamic-tool":
      return part.toolCallId;
    default:
      return `${part.type}:${index}`;
  }
}
