import type { AccountSeed } from "./types";

// Additional demo accounts that round the SE's patch out to the full set, authored to match the
// hand-written core accounts: six distinct archetypes (legacy migration, security-review gate,
// multi-year renewal upsell, POC trending to win, usage-overage shock, and a stalled expansion),
// each with a usage curve that matches its story.
export const GENERATED_ACCOUNTS: AccountSeed[] = [
  {
    accountId: "ACC-6001",
    name: "Lumen Retail Group",
    industry: "Retail / E-commerce",
    segment: "Enterprise",
    arr: 320000,
    seOwner: "J. Okafor",
    slackChannel: "#acct-lumen-retail",
    situation:
      "Legacy-stack migration: cutting over from an aging on-prem warehouse to Vantage, usage ramping fast as workloads move, low execution risk.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-6001-A", name: "Lumen Retail: Platform Migration + Seat Expansion", stage: "Negotiation/Review", amount: 320000, closeDate: "2026-08-28", nextStep: "Finalize phased cutover SOW and Q3 seat true-up", riskFlag: "Commit" },
      ],
      contacts: [
        { contactId: "CON-6001-1", name: "Helena Voss", title: "VP, Data Platform", role: "champion", active: true },
        { contactId: "CON-6001-2", name: "Marcus Lee", title: "Director, Analytics Engineering", role: "influencer", active: true },
        { contactId: "CON-6001-3", name: "Priya Raman", title: "CFO", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-6001", createdAt: "2026-05-22", subject: "Bulk historical backfill from legacy warehouse timing out", priority: "P2", status: "resolved", slaBreached: false, csat: 5, body: "Initial three-year backfill job exceeded the batch window. Solved by chunking the load and raising parallelism, and the customer confirmed the reload completed cleanly." },
      { ticketId: "ZD-6002", createdAt: "2026-06-05", subject: "Schema mapping guidance for legacy Oracle types", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Team needed a mapping reference for legacy Oracle numeric and date types into Postgres. Provided the conversion guide and a sample dbt macro." },
      { ticketId: "ZD-6003", createdAt: "2026-06-19", subject: "Cutover runbook review for the orders pipeline", priority: "P3", status: "resolved", slaBreached: false, csat: null, body: "Requested an SE review of their dual-write cutover plan for the orders pipeline ahead of go-live. Reviewed and signed off with two minor sequencing changes." },
      { ticketId: "ZD-6004", createdAt: "2026-07-02", subject: "Dashboard latency after weekend cutover wave", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "Reported slower dashboards the morning after the largest cutover wave. Traced to a missing index on a new fact table, added it, and latency returned to baseline." },
    ],
    calls: [
      { callId: "GONG-601", callDate: "2026-05-20", title: "Migration kickoff and cutover sequencing", participants: "Helena Voss, Marcus Lee, J. Okafor", transcript: "Aligned on a phased cutover with the orders and inventory domains first and marketing analytics last. Helena confirmed executive sponsorship and a hard goal to retire the legacy warehouse by end of Q3. Marcus flagged the historical backfill as the biggest unknown. Agreed to run a backfill dry run the following week.", committedNextStep: "SE to schedule backfill dry run", nextStepStatus: "delivered" },
      { callId: "GONG-602", callDate: "2026-06-12", title: "Mid-migration checkpoint", participants: "Marcus Lee, J. Okafor", transcript: "Three of five domains are live on Vantage and query volume is tracking ahead of plan. Marcus is comfortable with the pace and wants to accelerate the marketing analytics domain. He raised a question about seat licensing as more analysts get pulled in. Agreed to model a Q3 seat true-up.", committedNextStep: "SE to send seat true-up model", nextStepStatus: "delivered" },
      { callId: "GONG-603", callDate: "2026-07-08", title: "Go-live readiness and commercial true-up", participants: "Helena Voss, Priya Raman, J. Okafor", transcript: "Reviewed the final cutover wave and the legacy decommission timeline. Priya confirmed budget for the expanded seat count and asked for a phased payment aligned to legacy shutdown. Helena called the migration the smoothest platform change her team has run. Agreed to finalize the SOW and true-up by end of month.", committedNextStep: "Finalize cutover SOW and seat true-up", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-6001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 40 }, { week: "2026-05-26", value: 55 }, { week: "2026-06-02", value: 72 }, { week: "2026-06-09", value: 90 }, { week: "2026-06-16", value: 110 }, { week: "2026-06-23", value: 128 }, { week: "2026-06-30", value: 145 }, { week: "2026-07-07", value: 160 }, { week: "2026-07-14", value: 172 } ], summary: "active seats climbed steadily from 40 to 172 as teams onboarded through the phased migration" },
      { usageId: "USG-6002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 800000 }, { week: "2026-05-26", value: 1200000 }, { week: "2026-06-02", value: 2100000 }, { week: "2026-06-09", value: 3400000 }, { week: "2026-06-16", value: 5000000 }, { week: "2026-06-23", value: 6800000 }, { week: "2026-06-30", value: 8500000 }, { week: "2026-07-07", value: 10200000 }, { week: "2026-07-14", value: 12000000 } ], summary: "API volume ramped from 0.8M to 12M per week as workloads cut over from the legacy stack" },
    ],
  },
  {
    accountId: "ACC-7001",
    name: "Sentinel Payments",
    industry: "Financial Services (Payments)",
    segment: "Enterprise",
    arr: 0,
    seOwner: "J. Okafor",
    slackChannel: "#acct-sentinel-pmts",
    situation:
      "New-logo deal gated by a security and compliance review: technically won, but SOC 2, pen test, and data-residency signoff are blocking close.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-7001-A", name: "Sentinel Payments: Platform Adoption", stage: "Proposal/Price Quote", amount: 480000, closeDate: "2026-09-30", nextStep: "Complete vendor security review and data-residency architecture signoff", riskFlag: "At Risk" },
      ],
      contacts: [
        { contactId: "CON-7001-1", name: "Aisha Rahman", title: "Staff Data Engineer", role: "champion", active: true },
        { contactId: "CON-7001-2", name: "Tom Buckley", title: "CISO", role: "blocker", active: true },
        { contactId: "CON-7001-3", name: "Elena Sorokin", title: "VP, Engineering", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-7001", createdAt: "2026-05-27", subject: "Request for SOC 2 Type II report and pen test summary", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Security team requested the latest SOC 2 Type II report and the most recent third-party penetration test summary for their vendor review. Shared under NDA and logged the review as in progress." },
      { ticketId: "ZD-7002", createdAt: "2026-06-10", subject: "Data residency: confirm regional isolation for EU workloads", priority: "P2", status: "open", slaBreached: false, csat: null, body: "CISO asked for written confirmation that EU customer data can be pinned to an EU region with no cross-region processing. Provided the regional architecture doc and are awaiting their signoff." },
      { ticketId: "ZD-7003", createdAt: "2026-06-24", subject: "Customer-managed encryption keys (CMEK) support question", priority: "P2", status: "escalated", slaBreached: false, csat: null, body: "Security review flagged a requirement for customer-managed encryption keys. Escalated to product to confirm timeline, as the feature is on the roadmap but not yet GA." },
      { ticketId: "ZD-7004", createdAt: "2026-07-09", subject: "SSO and SCIM setup for the security review sandbox", priority: "P3", status: "resolved", slaBreached: false, csat: 4, body: "Enabled SAML SSO and SCIM provisioning in their evaluation sandbox so the review team could validate access controls. Confirmed working." },
    ],
    calls: [
      { callId: "GONG-751", callDate: "2026-05-21", title: "Security review scoping", participants: "Aisha Rahman, Tom Buckley, J. Okafor", transcript: "Aisha confirmed the technical evaluation is complete and the team wants to move forward. Tom laid out a formal vendor security review as a hard gate before any signature. Key items are SOC 2, pen test results, data residency, and encryption key management. Agreed to work the review items in parallel to protect the close date.", committedNextStep: "SE to deliver security artifact package", nextStepStatus: "delivered" },
      { callId: "GONG-752", callDate: "2026-06-18", title: "Data residency and CMEK deep dive", participants: "Tom Buckley, J. Okafor", transcript: "Walked Tom through the regional isolation model for EU data and he was satisfied on residency. CMEK became the main open item and Tom said it is a firm requirement for his signoff. J. Okafor was transparent that CMEK is on the roadmap but not GA and offered an envelope-encryption mitigation. Tom agreed to review the mitigation with his team.", committedNextStep: "SE to send CMEK mitigation write-up", nextStepStatus: "delivered" },
      { callId: "GONG-753", callDate: "2026-07-10", title: "Deal path and close-date risk", participants: "Elena Sorokin, Aisha Rahman, J. Okafor", transcript: "Elena reaffirmed budget and strong sponsorship for the platform. She acknowledged the security review is the only thing between them and signature. The CMEK gap is the residual risk and could slip the deal a quarter if not resolved. Agreed to a joint working session with security and product to close the gap.", committedNextStep: "Schedule security and product working session", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-7001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 12 }, { week: "2026-05-26", value: 12 }, { week: "2026-06-02", value: 14 }, { week: "2026-06-09", value: 14 }, { week: "2026-06-16", value: 15 }, { week: "2026-06-23", value: 15 }, { week: "2026-06-30", value: 15 }, { week: "2026-07-07", value: 16 }, { week: "2026-07-14", value: 16 } ], summary: "active seats held flat in the low teens, capped to a small review sandbox while the security gate is open" },
      { usageId: "USG-7002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 120000 }, { week: "2026-05-26", value: 130000 }, { week: "2026-06-02", value: 125000 }, { week: "2026-06-09", value: 140000 }, { week: "2026-06-16", value: 135000 }, { week: "2026-06-23", value: 150000 }, { week: "2026-06-30", value: 145000 }, { week: "2026-07-07", value: 150000 }, { week: "2026-07-14", value: 155000 } ], summary: "API volume stayed flat near 0.14M per week, limited to sandbox validation pending security signoff" },
    ],
  },
  {
    accountId: "ACC-8001",
    name: "Granite Peak Energy",
    industry: "Energy / Utilities",
    segment: "Enterprise",
    arr: 540000,
    seOwner: "P. Raman",
    slackChannel: "#acct-granite-peak",
    situation:
      "Multi-year renewal with an upsell: healthy usage and a strong champion, renewing on a three-year term with a seat and volume expansion, high commit confidence.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-8001-A", name: "Granite Peak: Three-Year Renewal + Seat Expansion", stage: "Negotiation/Review", amount: 720000, closeDate: "2026-08-15", nextStep: "Legal redline on multi-year terms, procurement to issue PO", riskFlag: "Commit" },
        { oppId: "OPP-8001-B", name: "Granite Peak: Real-Time Alerting Module", stage: "Discovery", amount: 90000, closeDate: "2026-10-31", nextStep: "Scope grid-telemetry alerting use case with the data team", riskFlag: null },
      ],
      contacts: [
        { contactId: "CON-8001-1", name: "Robert Nkemelu", title: "Director, Grid Analytics", role: "champion", active: true },
        { contactId: "CON-8001-2", name: "Susan Alvarez", title: "VP, Operations", role: "economic_buyer", active: true },
        { contactId: "CON-8001-3", name: "Kevin Tran", title: "Lead Data Engineer", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-8001", createdAt: "2026-05-29", subject: "Add read replica for reporting workload isolation", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Requested guidance on isolating heavy reporting queries from operational workloads. Recommended a read replica pattern and helped size it, and the customer confirmed improved stability after implementing." },
      { ticketId: "ZD-8002", createdAt: "2026-06-20", subject: "Renewal: confirm volume tier for expanded ingest", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Asked us to confirm the ingest volume tier that fits their next-year grid-telemetry growth. Provided sizing and the pricing tiers for the renewal." },
      { ticketId: "ZD-8003", createdAt: "2026-07-07", subject: "Scoping real-time alerting on telemetry streams", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Data team asked how to trigger near-real-time alerts on threshold breaches in telemetry. Shared a reference pattern and opened a discovery thread for the alerting module." },
    ],
    calls: [
      { callId: "GONG-801", callDate: "2026-05-28", title: "Renewal planning and expansion", participants: "Robert Nkemelu, Susan Alvarez, J. Okafor", transcript: "Robert reported the platform is now core to grid analytics and adoption keeps growing. Susan signaled intent to move to a three-year term for budget certainty. They discussed a seat expansion to cover two new analytics teams. Agreed to draft a multi-year renewal with the expansion baked in.", committedNextStep: "SE to draft multi-year renewal proposal", nextStepStatus: "delivered" },
      { callId: "GONG-802", callDate: "2026-06-24", title: "Renewal terms and new module interest", participants: "Robert Nkemelu, Kevin Tran, J. Okafor", transcript: "Robert confirmed the three-year renewal is moving through procurement with strong internal support. Kevin raised a new use case for near-real-time alerting on telemetry thresholds. The interest is genuine but scoped as a fast-follow after renewal. Agreed to run a discovery session on the alerting module.", committedNextStep: "SE to schedule alerting discovery", nextStepStatus: "delivered" },
      { callId: "GONG-803", callDate: "2026-07-11", title: "Legal and procurement checkpoint", participants: "Susan Alvarez, J. Okafor", transcript: "Susan confirmed budget approval for the multi-year renewal and expansion. Legal is doing a light redline on the multi-year terms and procurement will issue the PO once that clears. She expects to close within the month. No blockers raised.", committedNextStep: "Return legal redlines and confirm PO timing", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-8001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 210 }, { week: "2026-05-26", value: 214 }, { week: "2026-06-02", value: 220 }, { week: "2026-06-09", value: 228 }, { week: "2026-06-16", value: 235 }, { week: "2026-06-23", value: 240 }, { week: "2026-06-30", value: 248 }, { week: "2026-07-07", value: 255 }, { week: "2026-07-14", value: 262 } ], summary: "active seats grew steadily from 210 to 262 heading into the renewal" },
      { usageId: "USG-8002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 22000000 }, { week: "2026-05-26", value: 22500000 }, { week: "2026-06-02", value: 23000000 }, { week: "2026-06-09", value: 23400000 }, { week: "2026-06-16", value: 24000000 }, { week: "2026-06-23", value: 24600000 }, { week: "2026-06-30", value: 25000000 }, { week: "2026-07-07", value: 25500000 }, { week: "2026-07-14", value: 26000000 } ], summary: "API volume held high and rising, from 22M to 26M per week" },
    ],
  },
  {
    accountId: "ACC-9001",
    name: "Vireo Robotics",
    industry: "Robotics / Industrial IoT",
    segment: "Mid-Market",
    arr: 0,
    seOwner: "P. Raman",
    slackChannel: "#acct-vireo",
    situation:
      "Active POC trending to a win: eval usage ramping steadily against agreed success criteria, champion engaged, on track to convert to a paid contract.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-9001-A", name: "Vireo Robotics: POC to Production", stage: "Discovery", amount: 180000, closeDate: "2026-09-05", nextStep: "Hit final POC success metric on fleet-telemetry query latency", riskFlag: null },
      ],
      contacts: [
        { contactId: "CON-9001-1", name: "Hannah Cho", title: "Head of Data", role: "champion", active: true },
        { contactId: "CON-9001-2", name: "Diego Martins", title: "Staff Software Engineer", role: "user", active: true },
        { contactId: "CON-9001-3", name: "Bill Farrelly", title: "VP, Engineering", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-9001", createdAt: "2026-05-26", subject: "POC environment provisioning and sample data load", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Set up the POC workspace and helped load a sample fleet-telemetry dataset. Customer confirmed they could run their first queries the same day." },
      { ticketId: "ZD-9002", createdAt: "2026-06-11", subject: "Query pattern help for time-series telemetry", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Asked for guidance modeling high-frequency robot telemetry as time-series in Postgres. Shared partitioning and continuous-aggregate patterns, and the team reported strong query performance." },
      { ticketId: "ZD-9003", createdAt: "2026-06-30", subject: "Benchmark: p95 latency on the fleet dashboard", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Team is validating the p95 latency success criterion for the fleet dashboard. Provided a benchmarking harness and tuning tips, and results are tracking toward the target." },
    ],
    calls: [
      { callId: "GONG-901", callDate: "2026-05-22", title: "POC kickoff and success criteria", participants: "Hannah Cho, Diego Martins, J. Okafor", transcript: "Defined three success criteria for the POC: ingest throughput, p95 dashboard latency, and analyst onboarding time. Hannah is the internal champion and wants to standardize the team on Vantage if the POC lands. Diego will drive the technical build. Agreed to a four-week POC with a mid-point check.", committedNextStep: "SE to deliver POC plan and environment", nextStepStatus: "delivered" },
      { callId: "GONG-902", callDate: "2026-06-16", title: "POC mid-point review", participants: "Hannah Cho, Diego Martins, J. Okafor", transcript: "Two of three success criteria are already met and usage is climbing as more of the team tries it. Diego is impressed with the time-series performance on Postgres. The remaining criterion is p95 latency on the fleet dashboard, which is close. Agreed to a focused tuning pass in the final week.", committedNextStep: "SE to run latency tuning session", nextStepStatus: "delivered" },
      { callId: "GONG-903", callDate: "2026-07-09", title: "Path to conversion", participants: "Hannah Cho, Bill Farrelly, J. Okafor", transcript: "Hannah reported the POC is essentially proven and the team wants to move to production. Bill confirmed there is budget for a mid-market contract if the final latency metric lands. The last benchmark is trending on target. Agreed to lock results this week and move to a proposal.", committedNextStep: "Finalize benchmark and send production proposal", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-9001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 5 }, { week: "2026-05-26", value: 8 }, { week: "2026-06-02", value: 12 }, { week: "2026-06-09", value: 18 }, { week: "2026-06-16", value: 25 }, { week: "2026-06-23", value: 32 }, { week: "2026-06-30", value: 40 }, { week: "2026-07-07", value: 48 }, { week: "2026-07-14", value: 55 } ], summary: "POC seats ramped from a handful to 55 as more of the team joined the eval" },
      { usageId: "USG-9002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 50000 }, { week: "2026-05-26", value: 90000 }, { week: "2026-06-02", value: 180000 }, { week: "2026-06-09", value: 320000 }, { week: "2026-06-16", value: 540000 }, { week: "2026-06-23", value: 820000 }, { week: "2026-06-30", value: 1100000 }, { week: "2026-07-07", value: 1400000 }, { week: "2026-07-14", value: 1800000 } ], summary: "eval API volume ramped from near zero to 1.8M per week as workloads were built out" },
    ],
  },
  {
    accountId: "ACC-10001",
    name: "Tallgrass Media",
    industry: "Media / AdTech",
    segment: "Mid-Market",
    arr: 150000,
    seOwner: "M. Alvarez",
    slackChannel: "#acct-tallgrass",
    situation:
      "Usage-based billing overage shock: a runaway pipeline spiked API volume and produced a large overage invoice, creating trust and budget friction that threatens the relationship.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-10001-A", name: "Tallgrass Media: Renewal + Committed-Use Restructure", stage: "Negotiation/Review", amount: 210000, closeDate: "2026-09-20", nextStep: "Propose committed-use tier with overage guardrails to rebuild trust", riskFlag: "At Risk" },
      ],
      contacts: [
        { contactId: "CON-10001-1", name: "Nina Alvarado", title: "Director, Data Engineering", role: "champion", active: true },
        { contactId: "CON-10001-2", name: "Greg Holloway", title: "VP, Finance", role: "economic_buyer", active: true },
        { contactId: "CON-10001-3", name: "Sam Okonkwo", title: "Senior Data Engineer", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-10001", createdAt: "2026-06-15", subject: "Unexpected spike in API usage over the weekend", priority: "P2", status: "resolved", slaBreached: false, csat: 3, body: "Reported a sudden jump in API volume starting Saturday. Traced to a misconfigured backfill job that was re-running every 15 minutes, and helped them stop and reconfigure it." },
      { ticketId: "ZD-10002", createdAt: "2026-06-22", subject: "Dispute: overage charges on this cycle's invoice", priority: "P1", status: "escalated", slaBreached: true, csat: 2, body: "Finance opened a billing dispute over overage charges driven by the runaway job. Escalated to the account team, and the SLA on first response was missed during the weekend spike." },
      { ticketId: "ZD-10003", createdAt: "2026-06-29", subject: "Set up usage alerts and hard caps", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "Requested budget alerts and a hard usage cap to prevent a repeat. Configured threshold alerts at 70 and 90 percent plus a soft cap with notification." },
      { ticketId: "ZD-10004", createdAt: "2026-07-08", subject: "Request usage-by-job breakdown for cost attribution", priority: "P3", status: "resolved", slaBreached: false, csat: 4, body: "Asked for a per-job usage breakdown so they can attribute cost internally. Provided the usage export and a sample attribution query." },
    ],
    calls: [
      { callId: "GONG-1001", callDate: "2026-06-17", title: "Overage incident review", participants: "Nina Alvarado, Sam Okonkwo, J. Okafor", transcript: "Walked through the root cause of the API spike, a backfill job stuck in a retry loop. Nina was frustrated the platform did not warn them before costs ran up. Agreed the fix is in place and turned to preventing a repeat with alerts and caps. J. Okafor committed to a billing review with finance.", committedNextStep: "SE to set up usage alerts and schedule a finance review", nextStepStatus: "delivered" },
      { callId: "GONG-1002", callDate: "2026-06-25", title: "Finance escalation on the invoice", participants: "Greg Holloway, Nina Alvarado, J. Okafor", transcript: "Greg made clear the overage invoice was not budgeted and damaged trust. He wants a credit for the runaway-job volume and predictable billing going forward. J. Okafor acknowledged the gap in proactive alerting and agreed to bring a committed-use proposal with guardrails. Greg said the renewal now hinges on getting billing under control.", committedNextStep: "SE to propose credit and committed-use restructure", nextStepStatus: "none" },
      { callId: "GONG-1003", callDate: "2026-07-10", title: "Committed-use proposal preview", participants: "Nina Alvarado, Greg Holloway, J. Okafor", transcript: "Previewed a committed-use tier that smooths spend and includes overage alerts and a hard cap. Greg responded positively to the guardrails and the proposed partial credit. Nina confirmed the technical fix has held and volume is stable at the new baseline. Agreed to formalize the proposal into the renewal.", committedNextStep: "Send formal committed-use renewal proposal", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-10001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 58 }, { week: "2026-05-26", value: 59 }, { week: "2026-06-02", value: 60 }, { week: "2026-06-09", value: 60 }, { week: "2026-06-16", value: 61 }, { week: "2026-06-23", value: 60 }, { week: "2026-06-30", value: 61 }, { week: "2026-07-07", value: 62 }, { week: "2026-07-14", value: 62 } ], summary: "active seats held flat around 60, seats were never the issue" },
      { usageId: "USG-10002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 4000000 }, { week: "2026-05-26", value: 4200000 }, { week: "2026-06-02", value: 4400000 }, { week: "2026-06-09", value: 4600000 }, { week: "2026-06-16", value: 13500000 }, { week: "2026-06-23", value: 6500000 }, { week: "2026-06-30", value: 5000000 }, { week: "2026-07-07", value: 4900000 }, { week: "2026-07-14", value: 4800000 } ], summary: "API volume spiked to 13.5M during a runaway backfill in mid-June, then settled back to a roughly 4.8M baseline after the fix" },
    ],
  },
  {
    accountId: "ACC-11001",
    name: "Harborview Genomics",
    industry: "Biotech / Genomics",
    segment: "Enterprise",
    arr: 300000,
    seOwner: "M. Alvarez",
    slackChannel: "#acct-harborview",
    situation:
      "Expansion stalled: the champion moved to a new internal role and a missing Postgres CDC connector blocks the planned production rollout, putting growth on hold.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-11001-A", name: "Harborview Genomics: Production Expansion", stage: "Discovery", amount: 240000, closeDate: "2026-10-15", nextStep: "Re-engage new data platform owner and confirm CDC connector timeline", riskFlag: "At Risk" },
      ],
      contacts: [
        { contactId: "CON-11001-1", name: "David Osei", title: "Director, Research Computing (formerly Data Platform)", role: "champion", active: false },
        { contactId: "CON-11001-2", name: "Rachel Kimura", title: "Interim Data Platform Lead", role: "influencer", active: true },
        { contactId: "CON-11001-3", name: "Anil Gupta", title: "Principal Bioinformatics Engineer", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-11001", createdAt: "2026-05-25", subject: "CDC connector for Postgres source: availability?", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Asked whether a native change-data-capture connector for their Postgres source is available for the production rollout. Confirmed it is on the roadmap but not yet GA, and logged it as a blocker for their expansion." },
      { ticketId: "ZD-11002", createdAt: "2026-06-09", subject: "Access handoff: update account owner and admin roles", priority: "P3", status: "resolved", slaBreached: false, csat: 4, body: "Requested we transfer platform admin ownership after an internal reorg. Updated the primary admin and reviewed role assignments with the new team." },
      { ticketId: "ZD-11003", createdAt: "2026-06-23", subject: "Workaround for near-real-time sync without CDC", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Team asked for an interim sync approach while the CDC connector is pending. Proposed a scheduled incremental sync as a stopgap, and the team is evaluating whether the latency is acceptable." },
      { ticketId: "ZD-11004", createdAt: "2026-07-07", subject: "Re-onboarding session for the new data platform lead", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "New interim lead requested an orientation on the current deployment and open items. Ran a re-onboarding session and shared the account status and roadmap." },
    ],
    calls: [
      { callId: "GONG-1101", callDate: "2026-05-20", title: "Production expansion planning", participants: "David Osei, Anil Gupta, J. Okafor", transcript: "David laid out the plan to expand from the current analytics use case into a production genomics pipeline. Anil flagged that the rollout depends on a native Postgres CDC connector for low-latency sync. Without it, the production pattern does not meet their latency needs. Agreed to confirm the connector timeline before committing to expansion.", committedNextStep: "SE to confirm CDC connector roadmap timeline", nextStepStatus: "delivered" },
      { callId: "GONG-1102", callDate: "2026-06-11", title: "Sponsor transition", participants: "David Osei, Rachel Kimura, J. Okafor", transcript: "David shared that he is moving into a research computing leadership role and handing the platform to Rachel as interim lead. He remains supportive but will no longer drive day to day. Rachel is ramping and cautious about committing to expansion until she understands the open items. Agreed to a re-onboarding session and to keep the expansion warm.", committedNextStep: "SE to schedule re-onboarding for the new lead", nextStepStatus: "delivered" },
      { callId: "GONG-1103", callDate: "2026-07-08", title: "Expansion status with new lead", participants: "Rachel Kimura, Anil Gupta, J. Okafor", transcript: "Rachel is now oriented but wants the CDC connector question resolved before she will sponsor the expansion. Anil confirmed the scheduled-sync stopgap works for some workloads but not the latency-sensitive ones. The expansion is effectively paused on the connector and the new sponsor's confidence. Agreed to revisit once there is a firm connector date.", committedNextStep: "Bring a firm CDC connector date to the next review", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-11001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 85 }, { week: "2026-05-26", value: 86 }, { week: "2026-06-02", value: 85 }, { week: "2026-06-09", value: 84 }, { week: "2026-06-16", value: 86 }, { week: "2026-06-23", value: 85 }, { week: "2026-06-30", value: 84 }, { week: "2026-07-07", value: 85 }, { week: "2026-07-14", value: 84 } ], summary: "active seats sat flat around 85, expansion is on hold so no growth" },
      { usageId: "USG-11002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 6100000 }, { week: "2026-05-26", value: 6200000 }, { week: "2026-06-02", value: 6000000 }, { week: "2026-06-09", value: 6100000 }, { week: "2026-06-16", value: 6000000 }, { week: "2026-06-23", value: 6200000 }, { week: "2026-06-30", value: 6100000 }, { week: "2026-07-07", value: 6000000 }, { week: "2026-07-14", value: 6100000 } ], summary: "API volume held flat near 6.1M per week, blocked from growing until the CDC connector lands" },
    ],
  },
];
