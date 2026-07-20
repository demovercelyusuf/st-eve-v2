import { warehousePool } from "../warehouse/client";

// The Salesforce adapter reads the live CRM: the current opportunity, stage, amount, close date,
// and contacts. In the demo the CRM is mocked as the `sfdc` schema in the same database, but it is
// always reached through this adapter and never through the warehouse read path, so it behaves as a
// separate system of record. Swapping in a real Salesforce org means pointing SALESFORCE_API_URL at
// it and replacing these queries with SOQL calls; nothing else in the copilot changes.

export type Opportunity = {
  oppId: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string | null;
  nextStep: string | null;
  riskFlag: string | null;
};

export type Contact = {
  contactId: string;
  name: string;
  title: string;
  role: string | null;
  active: boolean;
};

export type SalesforceAccount = {
  accountId: string;
  name: string;
  industry: string | null;
  ownerSe: string | null;
  opportunities: Opportunity[];
  contacts: Contact[];
};

function toDate(value: unknown): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

export async function getSalesforceAccount(accountId: string): Promise<SalesforceAccount | null> {
  // The demo path reads the mocked CRM schema. A real deployment branches on SALESFORCE_MODE and
  // calls SALESFORCE_API_URL over HTTPS with a JWT bearer instead.
  const pool = warehousePool();

  const account = await pool.query(
    `select account_id, name, industry, owner_se from sfdc.accounts where account_id = $1`,
    [accountId],
  );
  if (account.rowCount === 0) return null;

  const [opps, contacts] = await Promise.all([
    pool.query(
      `select opp_id, name, stage, amount, close_date, next_step, risk_flag
         from sfdc.opportunities where account_id = $1 order by close_date asc nulls last`,
      [accountId],
    ),
    pool.query(
      `select contact_id, name, title, role, active
         from sfdc.contacts where account_id = $1 order by active desc, name asc`,
      [accountId],
    ),
  ]);

  const a = account.rows[0];
  return {
    accountId: a.account_id,
    name: a.name,
    industry: a.industry,
    ownerSe: a.owner_se,
    opportunities: opps.rows.map((o) => ({
      oppId: o.opp_id,
      name: o.name,
      stage: o.stage,
      amount: o.amount,
      closeDate: toDate(o.close_date),
      nextStep: o.next_step,
      riskFlag: o.risk_flag,
    })),
    contacts: contacts.rows.map((c) => ({
      contactId: c.contact_id,
      name: c.name,
      title: c.title,
      role: c.role,
      active: c.active,
    })),
  };
}
