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
type ChannelLookup =
  | { ok: true; channel: SlackChannel }
  | { ok: false; reason: string };

// A Slack channel id, as opposed to a name. C for public, G for legacy private, D for a DM.
const CHANNEL_ID = /^[CGD][A-Z0-9]{6,}$/;

export async function resolveChannel(token: string): Promise<ChannelLookup> {
  const preferred = process.env.SLACK_BRIEF_CHANNEL?.replace(/^#/, "");

  // An id posts straight through. This is the better configuration and not just a shortcut: looking
  // a channel up by name needs channels:read, which is a broad scope granting visibility of every
  // channel in the workspace, in order to answer a question the deployment could simply have been
  // told the answer to. With an id, the app needs chat:write and nothing else.
  if (preferred && CHANNEL_ID.test(preferred)) {
    return { ok: true, channel: { id: preferred, is_member: true, name: preferred } };
  }

  const json = await slack<{ ok: boolean; error?: string; channels?: SlackChannel[] }>(
    token,
    "conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200",
    { method: "GET" },
  );

  // Three failures that look identical from the outside and are fixed in three different places, so
  // they are reported separately. Collapsing them into one "could not post" is how somebody spends
  // an afternoon inviting a bot to channels when the actual problem was a missing scope.
  if (!json.ok) {
    return json.error === "missing_scope"
      ? {
          ok: false,
          reason:
            "Slack channel discovery needs the channels:read scope. Set SLACK_BRIEF_CHANNEL to a channel id instead and no discovery is needed.",
        }
      : { ok: false, reason: `Slack refused the channel lookup: ${json.error ?? "unknown error"}.` };
  }

  const channels = json.channels ?? [];
  const joined = channels.filter((c) => c.is_member);

  if (preferred) {
    const match = joined.find((c) => c.name === preferred) ?? channels.find((c) => c.name === preferred);
    if (match) return { ok: true, channel: match };
    return {
      ok: false,
      reason: `SLACK_BRIEF_CHANNEL is set to #${preferred}, and the app cannot see a channel by that name.`,
    };
  }

  if (joined.length === 0) {
    return {
      ok: false,
      reason:
        channels.length === 0
          ? "The app can see no channels at all in this workspace."
          : `The app can see ${channels.length} channels but has not been invited to any. Run /invite @Steve-v2 in the channel you want briefs in.`,
    };
  }

  return { ok: true, channel: joined[0] };
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

  const lookup = await resolveChannel(token);
  if (!lookup.ok) return lookup;
  const channel = lookup.channel;

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
