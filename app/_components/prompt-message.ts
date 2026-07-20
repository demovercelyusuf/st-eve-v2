import type { UserContent } from "ai";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

// Both copilot surfaces submit through the same composer, so they have to agree on what a submission
// with attachments turns into. Kept here rather than copied into each surface: the two would drift,
// and the failure mode is silent (an attachment quietly dropped on one surface and not the other).
//
// Returns a plain string for the common text-only case, because that is what eve's send() shorthand
// expects and it keeps the wire payload boring.
export function toAgentMessage(message: PromptInputMessage): string | UserContent {
  const text = message.text.trim();

  if (message.files.length === 0) {
    return text;
  }

  const parts: UserContent = [];
  if (text.length > 0) {
    parts.push({ text, type: "text" });
  }
  for (const file of message.files) {
    parts.push({
      data: file.url,
      filename: file.filename,
      mediaType: file.mediaType,
      type: "file",
    });
  }

  return parts;
}

// A submission is worth sending if it carries either words or files.
export function isSendable(message: PromptInputMessage): boolean {
  return message.text.trim().length > 0 || message.files.length > 0;
}
