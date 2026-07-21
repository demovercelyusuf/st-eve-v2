import { connectSlackCredentials } from "@vercel/connect/eve";
import { defaultSlackAuth, slackChannel } from "eve/channels/slack";
import { toolResultFrom } from "eve/tools";
import { briefCard } from "../../lib/slack/brief-card";
import emitBrief from "../tools/emit_brief";

// Slack, on eve's native channel. This is the primary interface: an SE asks in the deal channel and
// the cited brief comes back in the thread.
//
// The dispatch surface is app_mention and message.im. Slash commands are not expressible here, and
// that is a property of the framework rather than a gap we could close: slackChannel routes
// form-encoded posts into the interaction handler, which returns a bare 200 for anything that is not
// block_actions or view_submission, so `/brief Northwind` is parsed into a typed payload and then
// dropped. The SE would see the literal word "ok".
//
// A mention is the better surface anyway. It has a thread, so the reply lands somewhere a follow up
// can continue in the same durable session, and Slack attaches a user principal for a human author,
// which is what lets Vercel Connect mint a user-scoped token for the systems Steve reads.

// The Connect connector. Its bot token is minted per inbound webhook and rotates server side, so
// there is no SLACK_BOT_TOKEN in the environment to leak, and revoking access is a dashboard action
// rather than an env var edit and a redeploy.
const SLACK_CONNECTOR = "slack/steve-v2";

// Best effort, and swallowed on purpose. This runs on the inbound webhook side before the runtime
// cold-starts, and a thrown error here drops the mention entirely: failing to show a typing indicator
// must never cost the SE their brief.
async function startedTyping(ctx: { thread: { startTyping(text?: string): Promise<unknown> } }) {
  try {
    await ctx.thread.startTyping("Reading the warehouse and the CRM...");
  } catch {
    // no signal is worse than a wrong signal, but neither is worth a dropped turn
  }
}

export default slackChannel({
  credentials: connectSlackCredentials(SLACK_CONNECTOR),

  // Only what is new since our last reply. A brief thread is a conversation, and re-injecting the
  // whole thread on every mention would re-send the brief we just posted back into the next turn.
  threadContext: { since: "last-agent-reply" },

  // Drop anything a bot authored. The default dispatches whatever arrives, and a bot-authored mention
  // would let one integration start agent turns in a loop.
  //
  // The typing indicator is restored by hand here, and that is not decoration. Overriding
  // onAppMention replaces the framework default, which posted one, so the first version of this file
  // silently removed the only sign that anything was happening. A brief takes the better part of a
  // minute because composing twenty-odd cited claims is genuinely slow, and an SE watching an empty
  // thread for that long assumes it broke.
  onAppMention: (ctx, message) => {
    if (!message.author || message.author.isBot) return null;
    void startedTyping(ctx);
    return { auth: defaultSlackAuth(message, ctx) };
  },

  onDirectMessage: (ctx, message) => {
    if (!message.author || message.author.isBot) return null;
    void startedTyping(ctx);
    return { auth: defaultSlackAuth(message, ctx) };
  },

  events: {
    // The delivery path. The framework ships no default for action.result, so overriding it costs
    // nothing, and rendering from the tool result is what keeps the posted brief and the gated brief
    // the same object.
    async "action.result"(data, channel) {
      if (data.status !== "completed") return;

      const brief = toolResultFrom(data.result, emitBrief);
      if (!brief?.output?.shipped) return;

      // Adapter event handlers have their errors logged and swallowed, so a failure here is silent.
      // Caught explicitly to post something rather than leaving the SE watching a thread that never
      // resolves after the agent said it was writing a brief.
      try {
        await channel.thread.post(briefCard(brief.output as never));
      } catch {
        await channel.thread.post(
          "The brief was produced but could not be rendered. It is on the account page.",
        );
      }
    },
  },
});
