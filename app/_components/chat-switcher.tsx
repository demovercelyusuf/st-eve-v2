"use client";

import { ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { type PickerAccount, listChatAccounts } from "@/app/_actions/accounts";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GENERAL_CHAT_ID } from "@/lib/copilot/chat-storage";
import { cn } from "@/lib/utils";
import { AgentStatusDot } from "./agent-status-dot";
import { useCopilot } from "./copilot-provider";

// The one control that turns the copilot from a single conversation into a per-account desk. It names the
// chat on screen, lists the ones running alongside it — each with its own live status and an unread mark
// for a reply that landed while the SE was elsewhere — and starts a new one from the patch.
//
// Shared by both surfaces on purpose. The dock and /chat read the same set of sessions, so the switcher
// has to look and behave identically wherever it is mounted; two copies would drift the same way two chat
// renderers would. `compact` only trims the trigger for the narrow dock header.
export function ChatSwitcher({ compact = false }: { readonly compact?: boolean }) {
  const { chats, activeId, statusOf, unread, switchChat, closeChat, newChat } = useCopilot();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const active = chats.find((chat) => chat.id === activeId);
  // A hint on the trigger itself, so an unread reply in a background chat is visible without opening the
  // menu. Only counts the others: the active chat is on screen and by definition read.
  const othersUnread = [...unread].some((id) => id !== activeId);

  return (
    <>
      <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen}>
        <DropdownMenuTrigger
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            compact ? "max-w-[10rem]" : "max-w-[16rem]",
          )}
        >
          <AgentStatusDot status={statusOf(activeId)} />
          <span className="truncate font-medium">{active?.label ?? "Chat"}</span>
          {othersUnread ? (
            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
          ) : null}
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Switch chat</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1">
          <p className="px-2 py-1.5 font-medium text-muted-foreground text-xs">Chats</p>
          {chats.map((chat) => {
            const isActive = chat.id === activeId;
            const isUnread = unread.has(chat.id) && !isActive;
            const closable = chat.id !== GENERAL_CHAT_ID && chats.length > 1;
            return (
              <div
                className={cn(
                  "group flex items-center gap-1 rounded-sm",
                  isActive && "bg-accent",
                )}
                key={chat.id}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
                  onClick={() => {
                    switchChat(chat.id);
                    setMenuOpen(false);
                  }}
                  type="button"
                >
                  <AgentStatusDot status={statusOf(chat.id)} />
                  <span className="min-w-0 flex-1 truncate">{chat.label}</span>
                  {isUnread ? (
                    <span
                      aria-label="New reply"
                      className="size-1.5 shrink-0 rounded-full bg-amber-500"
                    />
                  ) : null}
                </button>
                {closable ? (
                  <button
                    aria-label={`Close ${chat.label}`}
                    className="mr-1 shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => closeChat(chat.id)}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}

          <div className="my-1 h-px bg-border" />
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            onClick={() => {
              setMenuOpen(false);
              setPickerOpen(true);
            }}
            type="button"
          >
            <PlusIcon className="size-3.5" />
            New chat
          </button>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountPicker
        onPick={(account) => {
          setPickerOpen(false);
          newChat(account);
        }}
        onOpenChange={setPickerOpen}
        open={pickerOpen}
      />
    </>
  );
}

// The searchable list of patch accounts behind "New chat". Loads the patch the first time it opens and
// keeps it, since the set does not change within a session and a spinner on every open would be noise.
function AccountPicker({
  onOpenChange,
  onPick,
  open,
}: {
  readonly onOpenChange: (open: boolean) => void;
  readonly onPick: (account: PickerAccount) => void;
  readonly open: boolean;
}) {
  const [accounts, setAccounts] = useState<PickerAccount[] | null>(null);
  const [loading, startLoading] = useTransition();

  useEffect(() => {
    if (!open || accounts !== null) return;
    startLoading(async () => {
      setAccounts(await listChatAccounts());
    });
  }, [open, accounts]);

  return (
    <CommandDialog
      description="Search your patch to start a chat about an account."
      onOpenChange={onOpenChange}
      open={open}
      title="New chat"
    >
      <CommandInput placeholder="Search your patch…" />
      <CommandList>
        <CommandEmpty>
          {loading || accounts === null ? "Loading your patch…" : "No accounts found."}
        </CommandEmpty>
        {accounts && accounts.length > 0 ? (
          <CommandGroup heading="Your patch">
            {accounts.map((account) => (
              <CommandItem
                key={account.id}
                onSelect={() => onPick(account)}
                value={`${account.name} ${account.id}`}
              >
                <span className="flex-1 truncate">{account.name}</span>
                <span className="ml-2 shrink-0 font-mono text-muted-foreground text-xs">
                  {account.id}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
