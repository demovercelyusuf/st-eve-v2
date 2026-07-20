import { CORE_ACCOUNTS } from "./accounts";
import { GENERATED_ACCOUNTS } from "./accounts.generated";
import type { AccountSeed } from "./types";

// The full seeded patch: the hand-authored core accounts plus the generated ones.
export const ALL_ACCOUNTS: AccountSeed[] = [...CORE_ACCOUNTS, ...GENERATED_ACCOUNTS];

export type { AccountSeed };
