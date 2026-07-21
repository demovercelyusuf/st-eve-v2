import { getToken } from "@vercel/connect";
import { cardToBlocks } from "eve/channels/slack";
import { briefCard, briefFallbackText, type RenderableBrief } from "./brief-card";

// Posting a brief into Slack from the web app.
//
// The agent's own Slack path is inbound: someone mentions Steve in a channel and the brief lands in
// that thread. This is the other direction. An SE reading a brief on the web decides it is worth
// sharing, and the same card goes to the account channel without them copying anything.
//
// The credential is minted per call through Connect with an app subject, the same connector the
// inbound channel uses. There is no bot token in the environment to leak, and revoking access is a
// dashboard action rather than an env var edit and a redeploy.

export const SLACK_CONNECTOR = "slack/steve-v2";

const SLACK_API = "https://slack.com/api";

export type PostResult =
  | { ok: true; channel: string; channelId: string; ts: string }
  | { ok: false; reason: string };

type SlackChannel = { id: string; name: string; is_member: boolean };

async function appToken(): Promise<string> {
  return await getToken(SLACK_CONNECTOR, { subject: { type: "app" } });
}

async function slack<T>(token: string, method: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SLACK_API}/${method}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  return (await res.json()) as T;
}

// Which channel a brief goes to.
//
// Deliberately discovered rather than configured. A channel id in an env var is one more thing that
// silently points at nothing after someone archives a channel, and the app already knows where it
// belongs: Slack tells us which channels this bot was invited to. SLACK_BRIEF_CHANNEL exists as an
// override for the case where the bot sits in several and the choice matters.
export async function resolveChannel(token: string): Promise<SlackChannel | null> {
  const preferred = process.env.SLACK_BRIEF_CHANNEL?.replace(/^#/, "");

  const json = await slack<{ ok: boolean; error?: string; channels?: SlackChannel[] }>(
    token,
    "conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200",
    { method: "GET" },
  );
  if (!json.ok) return null;

  const channels = json.channels ?? [];
  const joined = channels.filter((c) => c.is_member);
  if (preferred) {
    return joined.find((c) => c.name === preferred) ?? channels.find((c) => c.name === preferred) ?? null;
  }
  return joined[0] ?? null;
}

export async function postBriefToSlack(brief: RenderableBrief): Promise<PostResult> {
  let token: string;
  try {
    token = await appToken();
  } catch (error) {
    // The most common cause by far is the connector not being enabled for the environment this is
    // running in, which is worth saying out loud rather than reporting as a generic failure.
    return {
      ok: false,
      reason: `Slack is not connected for this environment (${error instanceof Error ? error.message : String(error)}).`,
    };
  }

  const channel = await resolveChannel(token);
  if (!channel) {
    return {
      ok: false,
      reason: "Steve is not a member of any Slack channel yet. Invite the app to a channel first.",
    };
  }

  // The same card the agent posts from a mention, built by the same function. Two renderers for one
  // artifact is how the web and Slack versions of a brief quietly stop agreeing.
  const posted = await slack<{ ok: boolean; error?: string; ts?: string }>(token, "chat.postMessage", {
    method: "POST",
    body: JSON.stringify({
      channel: channel.id,
      blocks: cardToBlocks(briefCard(brief)),
      text: briefFallbackText(brief),
      unfurl_links: false,
    }),
  });

  if (!posted.ok) return { ok: false, reason: `Slack rejected the message: ${posted.error}` };
  return { ok: true, channel: channel.name, channelId: channel.id, ts: posted.ts ?? "" };
}
