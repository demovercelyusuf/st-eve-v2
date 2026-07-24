"use server";

import { getPatchRows } from "@/lib/dashboard/patch";

export type PickerAccount = { readonly id: string; readonly name: string };

// The accounts the switcher offers when starting a new chat: the caller's patch, id and name only. The
// same rows the dashboard table is built from, so the two never disagree about what "your patch" is.
//
// A failure here is not worth surfacing as an error — the picker falls back to an empty list and the SE
// can still type an account into an existing chat. The account is re-authorized server-side on every read
// regardless, so this list is a convenience, not a permission boundary.
export async function listChatAccounts(): Promise<PickerAccount[]> {
  try {
    const rows = await getPatchRows();
    return rows.map((row) => ({ id: row.accountId, name: row.name }));
  } catch {
    return [];
  }
}
