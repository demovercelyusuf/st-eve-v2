// The shape of a seeded demo account. The warehouse tables (tickets, calls, usage) and the
// mock Salesforce CRM (opportunities, contacts) are both derived from this one object, so a
// single account reads as one coherent story across every system the copilot touches.

export type ContactRole =
  | "champion"
  | "economic_buyer"
  | "influencer"
  | "user"
  | "blocker";

export type SalesforceContact = {
  contactId: string;
  name: string;
  title: string;
  role: ContactRole;
  active: boolean;
};

export type SalesforceOpportunity = {
  oppId: string;
  name: string;
  stage: string;
  amount: number;
  closeDate: string | null;
  nextStep: string | null;
  riskFlag: "At Risk" | "Commit" | null;
};

export type Ticket = {
  ticketId: string;
  createdAt: string;
  subject: string;
  priority: "P1" | "P2" | "P3";
  status: "resolved" | "open" | "escalated";
  slaBreached: boolean;
  csat: number | null;
  body: string;
};

export type Call = {
  callId: string;
  callDate: string;
  title: string;
  participants: string;
  transcript: string;
  committedNextStep: string | null;
  nextStepStatus: "delivered" | "missed" | "none";
};

export type UsagePoint = { week: string; value: number };

export type UsageSeries = {
  usageId: string;
  metricName: "active_seats" | "api_calls_weekly";
  periodStart: string;
  periodEnd: string;
  series: UsagePoint[];
  summary: string;
};

export type AccountSeed = {
  accountId: string;
  name: string;
  industry: string;
  segment: string;
  arr: number;
  seOwner: string;
  slackChannel: string;
  situation: string;
  salesforce: {
    opportunities: SalesforceOpportunity[];
    contacts: SalesforceContact[];
  };
  tickets: Ticket[];
  calls: Call[];
  usage: UsageSeries[];
};
