import { NextResponse } from "next/server";
import { z } from "zod";
import { postBriefToSlack } from "@/lib/slack/post";

// Post a brief the SE is looking at into the account channel.
//
// The body is validated rather than trusted. This endpoint mints a Slack credential and writes into
// a workspace, so "the client sent something shaped roughly like a brief" is not a good enough
// reason to post it. The shape below mirrors RenderableBrief, which is what briefCard renders from.
const briefBody = z.object({
  account: z.string().min(1),
  accountId: z.string().min(1),
  summary: z.string().min(1),
  nextSteps: z.array(
    z.object({
      priority: z.string(),
      text: z.string(),
      owner: z.string(),
      citations: z.array(z.string()),
    }),
  ),
  stageRead: z.object({
    salesforceStage: z.string(),
    groundedRead: z.string(),
    riskLevel: z.string(),
    confidence: z.number(),
    signals: z.array(z.string()),
  }),
  needsReview: z.array(z.object({ text: z.string(), reason: z.string() })),
  citedIds: z.array(z.string()),
  grounding: z.object({
    shippedClaims: z.number(),
    citedClaims: z.number(),
    droppedClaims: z.number(),
  }),
  sources: z
    .array(
      z.object({
        citationId: z.string(),
        label: z.string().optional(),
        url: z.string().nullish(),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = briefBody.safeParse((body as { brief?: unknown } | null)?.brief);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "That does not look like a brief this app produced." },
      { status: 400 },
    );
  }

  const result = await postBriefToSlack(parsed.data);
  // A failure here is expected traffic rather than an exception: Slack can be unreachable and the
  // app can be out of every channel. 502 so the client can tell that apart from a bad request.
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
