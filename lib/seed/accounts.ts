import type { AccountSeed } from "./types";

// The SE's patch. Five hand-authored accounts, each internally consistent: the usage trend, the
// support load, and the calls all tell the same story as the situation. Northwind is the flagship
// churn case the grounding demo runs on; Helios is the healthy contrast used as the demo backup.
// Additional accounts are appended from lib/seed/accounts.generated.ts to round the patch out.

export const CORE_ACCOUNTS: AccountSeed[] = [
  {
    accountId: "ACC-1088",
    name: "Helios Freight Systems",
    industry: "Logistics",
    segment: "Enterprise",
    arr: 340000,
    seOwner: "J. Okafor",
    slackChannel: "#acct-helios",
    situation: "Healthy expansion. Usage climbing, champion advocating, low risk.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-1088-E",
          name: "Helios - Data Platform Expansion (Tier 3 + Streaming)",
          stage: "Proposal/Price Quote",
          amount: 210000,
          closeDate: "2026-08-14",
          nextStep: "Security review call on 2026-07-22",
          riskFlag: "Commit",
        },
      ],
      contacts: [
        { contactId: "CON-1088-1", name: "Sofia Vega", title: "Director of Analytics", role: "champion", active: true },
        { contactId: "CON-1088-2", name: "Aisha Bello", title: "VP Engineering", role: "economic_buyer", active: true },
        { contactId: "CON-1088-3", name: "Tom Feld", title: "Data Engineering Lead", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-1103", createdAt: "2026-06-27", subject: "Feature request: Kafka streaming connector", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Sofia's team wants a native Kafka source for the new fraud-analytics pipeline. Routed to product; workaround shared." },
      { ticketId: "ZD-1121", createdAt: "2026-07-07", subject: "Increase API rate limit for new pipeline", priority: "P2", status: "resolved", slaBreached: false, csat: 5, body: "Rate limit raised to support the expanded ingestion volume. Resolved same day." },
      { ticketId: "ZD-1130", createdAt: "2026-07-12", subject: "SSO group mapping for 40 new analysts", priority: "P3", status: "resolved", slaBreached: false, csat: null, body: "Okta group mapping configured for the incoming analyst cohort ahead of the expansion." },
    ],
    calls: [
      { callId: "GONG-104", callDate: "2026-06-30", title: "Expansion scoping", participants: "Sofia Vega, J. Okafor", transcript: "Sofia wants the Tier 3 streaming tier for a new fraud-analytics team standing up next quarter. Demand is coming from the business, not from us. She asked for a written proposal to take to Aisha.", committedNextStep: "Vantage to send the expansion proposal by 2026-07-07", nextStepStatus: "delivered" },
      { callId: "GONG-118", callDate: "2026-07-14", title: "Proposal review", participants: "Aisha Bello, Sofia Vega, J. Okafor", transcript: "Aisha verbally approves the budget and expects procurement to paper it by early August. She wants a security review of the streaming tier before signing. Positive throughout.", committedNextStep: "Security review call on 2026-07-22", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-1104", metricName: "active_seats", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 180 }, { week: "2026-06-02", value: 192 }, { week: "2026-06-09", value: 205 }, { week: "2026-06-16", value: 220 }, { week: "2026-06-23", value: 232 }, { week: "2026-06-30", value: 244 }, { week: "2026-07-07", value: 253 }, { week: "2026-07-14", value: 260 } ], summary: "weekly active seats climbed from 180 to 260 over eight weeks" },
      { usageId: "USG-1105", metricName: "api_calls_weekly", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 6100000 }, { week: "2026-06-02", value: 6900000 }, { week: "2026-06-09", value: 7800000 }, { week: "2026-06-16", value: 8700000 }, { week: "2026-06-23", value: 9600000 }, { week: "2026-06-30", value: 10500000 }, { week: "2026-07-07", value: 11200000 }, { week: "2026-07-14", value: 11800000 } ], summary: "API volume grew from 6.1M to 11.8M calls per week, demand-led" },
    ],
  },

  {
    accountId: "ACC-2041",
    name: "Northwind Trading Co.",
    industry: "Wholesale Distribution",
    segment: "Enterprise",
    arr: 480000,
    seOwner: "J. Okafor",
    slackChannel: "#acct-northwind",
    situation: "Churn-risk flagship. Support spike, usage collapse, and a departed champion.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-2041-R",
          name: "Northwind - FY26 Renewal + Platform",
          stage: "Negotiation/Review",
          amount: 480000,
          closeDate: "2026-08-29",
          nextStep: null,
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-2041-1", name: "Dana Whitfield", title: "VP Data Engineering", role: "champion", active: false },
        { contactId: "CON-2041-2", name: "Marcus Rho", title: "Director of Platform Engineering", role: "influencer", active: true },
        { contactId: "CON-2041-3", name: "Priya Nandakumar", title: "CFO Office", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-4471", createdAt: "2026-06-24", subject: "API latency over 2s on batch sync jobs", priority: "P1", status: "resolved", slaBreached: true, csat: 3, body: "Batch sync latency exceeded 2 seconds for nine days before the first fix. Root cause tied to ingestion backpressure. SLA breached." },
      { ticketId: "ZD-4488", createdAt: "2026-06-29", subject: "Connector failures on nightly ingest (Postgres CDC)", priority: "P1", status: "open", slaBreached: true, csat: null, body: "Nightly change-data-capture ingest from the customer's Postgres source fails intermittently. SLA breached, still open." },
      { ticketId: "ZD-4503", createdAt: "2026-07-03", subject: "Dashboard timeouts for analyst team", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Analysts report dashboard timeouts during peak hours. Under investigation." },
      { ticketId: "ZD-4519", createdAt: "2026-07-09", subject: "Escalation: repeated sync failures, requesting formal RCA", priority: "P1", status: "escalated", slaBreached: false, csat: 2.4, body: "Customer escalated the repeated sync failures and formally requested a root cause analysis. CSAT 2.4 out of 5. This ties back to the RCA promised on the June 18 call." },
      { ticketId: "ZD-4527", createdAt: "2026-07-14", subject: "How do we export our data? evaluating alternatives", priority: "P3", status: "open", slaBreached: false, csat: null, body: "An analyst asks how to export their data while the team evaluates alternatives. In-product churn signal." },
    ],
    calls: [
      { callId: "GONG-882", callDate: "2026-06-18", title: "Quarterly sync", participants: "Dana Whitfield, J. Okafor", transcript: "Champion Dana flags executive pressure on reliability after the recent incidents. She needs a formal root cause analysis and a reliability plan to defend the renewal internally.", committedNextStep: "Vantage to deliver an RCA and reliability plan by 2026-06-30", nextStepStatus: "missed" },
      { callId: "GONG-911", callDate: "2026-07-08", title: "Escalation call with new stakeholder", participants: "Marcus Rho, J. Okafor", transcript: "New stakeholder Marcus Rho would not commit to the renewal and said the team is comparing options. He did not name a competitor. No next step was agreed.", committedNextStep: null, nextStepStatus: "none" },
      { callId: "GONG-925", callDate: "2026-07-15", title: "QBR scheduling attempt", participants: "J. Okafor, Northwind reception", transcript: "Attempt to schedule the QBR. Dana Whitfield's line was disconnected and reception confirmed she left Northwind on 2026-06-30. Champion departure recorded.", committedNextStep: null, nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-2208", metricName: "active_seats", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 238 }, { week: "2026-06-02", value: 231 }, { week: "2026-06-09", value: 224 }, { week: "2026-06-16", value: 205 }, { week: "2026-06-23", value: 176 }, { week: "2026-06-30", value: 142 }, { week: "2026-07-07", value: 118 }, { week: "2026-07-14", value: 96 } ], summary: "weekly active seats fell from 238 to 96 against a contracted 250, down about 60 percent" },
      { usageId: "USG-2209", metricName: "api_calls_weekly", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 12400000 }, { week: "2026-06-02", value: 11100000 }, { week: "2026-06-09", value: 9800000 }, { week: "2026-06-16", value: 8000000 }, { week: "2026-06-23", value: 6200000 }, { week: "2026-06-30", value: 4800000 }, { week: "2026-07-07", value: 3600000 }, { week: "2026-07-14", value: 3000000 } ], summary: "API volume fell from 12.4M to 3.0M calls per week, down about 76 percent" },
    ],
  },

  {
    accountId: "ACC-3127",
    name: "Cobalt Sky Analytics",
    industry: "Marketing Technology",
    segment: "Mid-Market",
    arr: 0,
    seOwner: "P. Raman",
    slackChannel: "#acct-cobalt",
    situation: "Stalled new-business deal. Evaluator went dark, close date past, trial usage lapsed.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-3127-N",
          name: "Cobalt Sky - New Business (Platform Core)",
          stage: "Proposal/Price Quote",
          amount: 175000,
          closeDate: "2026-06-30",
          nextStep: null,
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-3127-1", name: "Nathan Cole", title: "Analytics Lead", role: "champion", active: true },
        { contactId: "CON-3127-2", name: "Grace Lim", title: "Procurement", role: "influencer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-3112", createdAt: "2026-05-20", subject: "Trial: sandbox access for eval", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Sandbox access provisioned for the evaluation. Resolved same day." },
      { ticketId: "ZD-3119", createdAt: "2026-05-28", subject: "Trial: sample data load question", priority: "P3", status: "resolved", slaBreached: false, csat: null, body: "Answered a question about loading sample data into the trial workspace. No tickets since." },
    ],
    calls: [
      { callId: "GONG-701", callDate: "2026-05-22", title: "Eval kickoff", participants: "Nathan Cole, J. Okafor", transcript: "Nathan is positive on ingestion speed during the eval kickoff. He wants a pricing proposal to take to procurement.", committedNextStep: "Vantage to send a pricing proposal by 2026-05-29", nextStepStatus: "delivered" },
      { callId: "GONG-708", callDate: "2026-06-03", title: "Proposal walkthrough", participants: "Nathan Cole, J. Okafor", transcript: "Walked through the proposal. Nathan said he needs to align internally on budget. No committed next step was set, and there has been no contact logged since.", committedNextStep: null, nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-3113", metricName: "active_seats", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 6 }, { week: "2026-06-02", value: 6 }, { week: "2026-06-09", value: 4 }, { week: "2026-06-16", value: 1 }, { week: "2026-06-23", value: 0 }, { week: "2026-06-30", value: 0 }, { week: "2026-07-07", value: 0 }, { week: "2026-07-14", value: 0 } ], summary: "trial-workspace active seats dropped from 6 to 0 after mid-June" },
      { usageId: "USG-3114", metricName: "api_calls_weekly", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 90000 }, { week: "2026-06-02", value: 70000 }, { week: "2026-06-09", value: 30000 }, { week: "2026-06-16", value: 4000 }, { week: "2026-06-23", value: 0 }, { week: "2026-06-30", value: 0 }, { week: "2026-07-07", value: 0 }, { week: "2026-07-14", value: 0 } ], summary: "trial API volume fell to near zero after mid-June" },
    ],
  },

  {
    accountId: "ACC-4210",
    name: "Foundry Labs",
    industry: "Software",
    segment: "Commercial",
    arr: 96000,
    seOwner: "P. Raman",
    slackChannel: "#acct-foundry",
    situation: "New-logo onboarding. Land closed, usage ramping from zero, on plan.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-4210-L",
          name: "Foundry - New Logo Land",
          stage: "Closed Won",
          amount: 96000,
          closeDate: "2026-06-20",
          nextStep: null,
          riskFlag: "Commit",
        },
        {
          oppId: "OPP-4210-A",
          name: "Foundry - Analytics Add-on",
          stage: "Qualification",
          amount: 40000,
          closeDate: "2026-10-15",
          nextStep: "Analytics add-on scoping on 2026-07-28",
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-4210-1", name: "Ravi Malhotra", title: "Head of Data", role: "champion", active: true },
        { contactId: "CON-4210-2", name: "Ellen Park", title: "Analytics Manager", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-4201", createdAt: "2026-06-24", subject: "Provisioning: create prod and staging workspaces", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Provisioned production and staging workspaces as part of onboarding." },
      { ticketId: "ZD-4215", createdAt: "2026-07-01", subject: "Connector setup help: Postgres CDC", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Helped configure change-data-capture from their Postgres source. Working as expected." },
      { ticketId: "ZD-4229", createdAt: "2026-07-09", subject: "Onboarding: role-based access for 12 users", priority: "P3", status: "resolved", slaBreached: false, csat: null, body: "Set up role-based access for the first 12 users." },
      { ticketId: "ZD-4238", createdAt: "2026-07-15", subject: "How to schedule dbt runs", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Routine onboarding question about scheduling dbt runs. Docs shared." },
    ],
    calls: [
      { callId: "GONG-731", callDate: "2026-06-23", title: "Kickoff and onboarding plan", participants: "Ravi Malhotra, Ellen Park, J. Okafor", transcript: "Kickoff and onboarding plan agreed. Success criteria: first pipeline live by July 4 and 10 active users by July 31. Ravi is engaged.", committedNextStep: "Enablement session on 2026-06-27", nextStepStatus: "delivered" },
      { callId: "GONG-742", callDate: "2026-07-14", title: "Onboarding check-in", participants: "Ravi Malhotra, J. Okafor", transcript: "First pipeline is live and Ravi is happy with progress. Discussed a potential analytics add-on to scope later this month.", committedNextStep: "Analytics add-on scoping on 2026-07-28", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-4211", metricName: "active_seats", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 0 }, { week: "2026-06-02", value: 0 }, { week: "2026-06-09", value: 0 }, { week: "2026-06-16", value: 2 }, { week: "2026-06-23", value: 5 }, { week: "2026-06-30", value: 8 }, { week: "2026-07-07", value: 11 }, { week: "2026-07-14", value: 14 } ], summary: "weekly active seats ramped from 0 to 14 after go-live" },
      { usageId: "USG-4212", metricName: "api_calls_weekly", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 0 }, { week: "2026-06-02", value: 0 }, { week: "2026-06-09", value: 0 }, { week: "2026-06-16", value: 120000 }, { week: "2026-06-23", value: 320000 }, { week: "2026-06-30", value: 540000 }, { week: "2026-07-07", value: 740000 }, { week: "2026-07-14", value: 900000 } ], summary: "API volume ramped from 0 to 0.9M per week, early and on plan" },
    ],
  },

  {
    accountId: "ACC-5163",
    name: "Atlas Manufacturing",
    industry: "Manufacturing",
    segment: "Enterprise",
    arr: 320000,
    seOwner: "M. Alvarez",
    slackChannel: "#acct-atlas",
    situation: "Renewal at risk on commercial pressure. Product stable, price and competitor pressure.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-5163-R",
          name: "Atlas - FY26 Renewal",
          stage: "Negotiation/Review",
          amount: 320000,
          closeDate: "2026-08-08",
          nextStep: "Revised quote by 2026-07-18",
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-5163-1", name: "Karen Ives", title: "Data Platform Owner", role: "champion", active: true },
        { contactId: "CON-5163-2", name: "Derek Ohms", title: "Procurement", role: "blocker", active: true },
        { contactId: "CON-5163-3", name: "Bill Tran", title: "CFO Office", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5108", createdAt: "2026-06-26", subject: "Renewal: request FY25 usage report", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Provided the FY25 usage report for the renewal conversation." },
      { ticketId: "ZD-5117", createdAt: "2026-07-02", subject: "Question on overage pricing tiers", priority: "P3", status: "resolved", slaBreached: false, csat: null, body: "Clarified the overage pricing tiers for procurement." },
      { ticketId: "ZD-5124", createdAt: "2026-07-10", subject: "Contract: request month-to-month option", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Procurement asked about a month-to-month contract option. Commercial-risk signal." },
    ],
    calls: [
      { callId: "GONG-761", callDate: "2026-06-27", title: "Renewal kickoff", participants: "Karen Ives, Derek Ohms, J. Okafor", transcript: "Karen is supportive of renewing. Derek in procurement asked for a 15 percent reduction and mentioned evaluating a lower-cost option. The product is not the issue.", committedNextStep: "Value summary by 2026-07-03", nextStepStatus: "delivered" },
      { callId: "GONG-774", callDate: "2026-07-11", title: "Renewal negotiation", participants: "Bill Tran, Karen Ives, J. Okafor", transcript: "CFO office wants flat spend year over year. Discussed a multi-year discount in exchange for a longer commitment.", committedNextStep: "Revised quote by 2026-07-18", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-5109", metricName: "active_seats", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 120 }, { week: "2026-06-02", value: 121 }, { week: "2026-06-09", value: 119 }, { week: "2026-06-16", value: 120 }, { week: "2026-06-23", value: 118 }, { week: "2026-06-30", value: 119 }, { week: "2026-07-07", value: 118 }, { week: "2026-07-14", value: 118 } ], summary: "weekly active seats held flat around 120" },
      { usageId: "USG-5110", metricName: "api_calls_weekly", periodStart: "2026-05-26", periodEnd: "2026-07-14", series: [ { week: "2026-05-26", value: 4200000 }, { week: "2026-06-02", value: 4150000 }, { week: "2026-06-09", value: 4100000 }, { week: "2026-06-16", value: 4050000 }, { week: "2026-06-23", value: 4050000 }, { week: "2026-06-30", value: 4000000 }, { week: "2026-07-07", value: 4000000 }, { week: "2026-07-14", value: 4000000 } ], summary: "API volume steady near 4.0M per week, stable product usage" },
    ],
  },
];
