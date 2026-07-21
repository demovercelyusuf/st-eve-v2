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
    seOwner: "Yusuf",
    slackChannel: "#acct-helios",
    situation: "Healthy technical expansion. Benchmarks passed against the customer's own targets, reference architecture signed off, and their platform team is building on the product.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-1088-E",
          name: "Helios - Streaming Ingest Tier + Dual Region",
          stage: "Proposal/Price Quote",
          amount: 210000,
          closeDate: "2026-08-14",
          nextStep: "Security review call on 2026-07-22",
          riskFlag: "Commit",
        },
      ],
      contacts: [
        { contactId: "CON-1088-1", name: "Sofia Vega", title: "Director of Data Platform", role: "champion", active: true },
        { contactId: "CON-1088-2", name: "Aisha Bello", title: "VP Engineering", role: "economic_buyer", active: true },
        { contactId: "CON-1088-3", name: "Tom Feld", title: "Data Engineering Lead", role: "user", active: true },
        { contactId: "CON-1088-4", name: "Devin Osei", title: "Staff Security Engineer", role: "influencer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-1121", createdAt: "2026-06-24", subject: "Raise ingest rate limit to 60k events per second for the fraud pipeline", priority: "P2", status: "resolved", slaBreached: false, csat: 5, body: "Limit raised from 25k to 60k events per second on the Helios pilot tenant ahead of their load test. Their run sustained 58k events per second over four hours with no throttling and no consumer lag growth. Resolved same day." },
      { ticketId: "ZD-1103", createdAt: "2026-06-26", subject: "Kafka source connector: confirming exactly-once semantics end to end", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Tom Feld asked how the connector behaves with their idempotent producer configuration and whether offsets are committed transactionally with the sink write. Confirmed transactional commit and shared the checkpoint configuration for their fraud pipeline. Tom validated it against a deliberate consumer restart and saw no duplicates." },
      { ticketId: "ZD-1130", createdAt: "2026-07-13", subject: "Okta SCIM provisioning for the fraud analytics group", priority: "P3", status: "resolved", slaBreached: false, csat: null, body: "Configured SCIM provisioning and group to role mapping for the incoming 40 person fraud analytics cohort. Deprovisioning tested against a suspended test user and confirmed working within one sync cycle." },
    ],
    calls: [
      { callId: "GONG-104", callDate: "2026-06-29", title: "Benchmark readout and reference architecture review", participants: "Sofia Vega (Director of Data Platform), Tom Feld (Data Engineering Lead), Yusuf", transcript: "Tom presented the results of the load test his team ran themselves: 58k events per second sustained, p95 at 210ms and p99 at 380ms against their internal target of 500ms. We walked the dual region active-passive reference architecture and Sofia signed it off on the call, with the only change being a shorter replication lag alarm threshold on their side. Tom mentioned in passing that the payments platform group has started asking his team about the same connector, though nothing has been scoped.", committedNextStep: "Vantage to send the streaming tier proposal and the reference architecture document by 2026-07-06", nextStepStatus: "delivered" },
      { callId: "GONG-118", callDate: "2026-07-15", title: "Proposal and security walkthrough", participants: "Aisha Bello (VP Engineering), Sofia Vega (Director of Data Platform), Devin Osei (Staff Security Engineer), Yusuf", transcript: "Devin closed out both of his open questions on the call: customer-managed key support is confirmed for the streaming tier, and network egress stays inside their VPC over PrivateLink. He had no further findings and said he would put that in writing after a formal review session. Aisha said the budget is not a concern and that she will walk it through procurement, and she asked for the security session before anything is signed.", committedNextStep: "Security review call on 2026-07-22", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-1104", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 172 }, { week: "2026-05-26", value: 180 }, { week: "2026-06-02", value: 192 }, { week: "2026-06-09", value: 205 }, { week: "2026-06-16", value: 220 }, { week: "2026-06-23", value: 232 }, { week: "2026-06-30", value: 244 }, { week: "2026-07-07", value: 253 }, { week: "2026-07-14", value: 260 } ], summary: "weekly active seats climbed from 172 to 260 over nine weeks, ahead of the 40 seat fraud analytics cohort landing" },
      { usageId: "USG-1105", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 5600000 }, { week: "2026-05-26", value: 6100000 }, { week: "2026-06-02", value: 6900000 }, { week: "2026-06-09", value: 7800000 }, { week: "2026-06-16", value: 8700000 }, { week: "2026-06-23", value: 9600000 }, { week: "2026-06-30", value: 10500000 }, { week: "2026-07-07", value: 11200000 }, { week: "2026-07-14", value: 11800000 } ], summary: "ingest API volume grew from 5.6M to 11.8M calls per week with no throttling events recorded" },
    ],
  },

  {
    accountId: "ACC-2041",
    name: "Northwind Trading Co.",
    industry: "Wholesale Distribution",
    segment: "Enterprise",
    arr: 480000,
    seOwner: "Yusuf",
    slackChannel: "#acct-northwind",
    situation: "Flagship platform expansion stalled on technical grounds. Two phase 2 pilot exit criteria still failing, a throughput ceiling the platform team keeps hitting, one security finding open, and the technical champion quiet since late June.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-2041-P",
          name: "Northwind - Streaming Ingest Tier Expansion",
          stage: "Proposal/Price Quote",
          amount: 260000,
          closeDate: "2026-08-31",
          nextStep: "Re-run of the 72 hour ingestion soak test, date not agreed",
          riskFlag: "At Risk",
        },
        {
          oppId: "OPP-2041-R",
          name: "Northwind - FY26 Renewal",
          stage: "Negotiation/Review",
          amount: 480000,
          closeDate: "2026-09-30",
          nextStep: null,
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-2041-1", name: "Dana Whitfield", title: "VP Data Engineering", role: "champion", active: true },
        { contactId: "CON-2041-2", name: "Marcus Rho", title: "Director of Platform Engineering", role: "influencer", active: true },
        { contactId: "CON-2041-3", name: "Priya Nandakumar", title: "Principal Security Architect", role: "blocker", active: true },
        { contactId: "CON-2041-4", name: "Hal Brenner", title: "Finance Director, CFO Office", role: "economic_buyer", active: true },
        { contactId: "CON-2041-5", name: "Ines Duarte", title: "Staff Data Engineer", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-4462", createdAt: "2026-06-11", subject: "CDC connector drops rows during Postgres primary failover", priority: "P1", status: "escalated", slaBreached: true, csat: 2, body: "During Northwind's own failover drill the logical replication slot was not preserved on promotion of the standby, and the connector resumed from a stale LSN. Ines Duarte reconciled 41,900 missing rows across three fact tables. Phase 2 exit criterion 3 requires zero row loss across a controlled failover, so this run is recorded as a fail. Engineering has a fix targeted but no build date has been given to the customer." },
      { ticketId: "ZD-4471", createdAt: "2026-06-19", subject: "p99 query latency above target on the wide-fact workload", priority: "P2", status: "resolved", slaBreached: false, csat: 3, body: "Northwind measured p95 at 410ms and p99 at 1,240ms on their 92 column order-line fact table at 40k events per second. Resolved as configuration rather than defect: partition key and clustering guidance applied, which brought p99 down to 640ms on the customer's re-run. The phase 2 exit criterion is p99 under 500ms at 40k events per second, so the criterion remains unmet." },
      { ticketId: "ZD-4488", createdAt: "2026-06-30", subject: "72 hour ingest soak test aborted at 42 hours, sustained backpressure", priority: "P1", status: "open", slaBreached: true, csat: null, body: "The streaming tier soak test was aborted at hour 42 when consumer lag passed 900 seconds and did not recover. The ingest API call rate flattened near 9.4M per week while event throughput held near 40k per second. Marcus Rho's team asked whether the ceiling is a per tenant shard limit or their own broker configuration. Still open, no root cause issued." },
      { ticketId: "ZD-4503", createdAt: "2026-07-06", subject: "Pen test finding: customer-managed keys not enforced on staged objects", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Northwind's third party pen test found that objects in the ingestion staging bucket are encrypted with platform-managed keys rather than the customer's KMS key. Priya Nandakumar's team logged it as a medium finding requiring remediation or a documented compensating control before production cutover. Key management design doc supplied on 2026-07-09, customer verification pending." },
      { ticketId: "ZD-4519", createdAt: "2026-07-13", subject: "PrivateLink endpoint required, public ingest endpoint not permitted in prod", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Northwind's network standard forbids egress to public service endpoints from the production VPC. They need a PrivateLink endpoint in eu-central-1 plus a documented DNS pattern for their split-horizon resolver. Currently the pilot runs over an allow-listed NAT gateway that their platform team has confirmed will not be extended into production." },
    ],
    calls: [
      { callId: "GONG-902", callDate: "2026-06-16", title: "Phase 2 pilot exit criteria review", participants: "Dana Whitfield (VP Data Engineering), Marcus Rho (Director of Platform Engineering), Ines Duarte (Staff Data Engineer), Yusuf", transcript: "Walked the six phase 2 exit criteria one by one. Four pass: schema evolution, backfill of 14 months of history, RBAC mapping to their Okta groups, and dbt model parity against their existing warehouse. Two fail: zero row loss across a controlled Postgres failover, and p99 under 500ms at 40k events per second on the wide-fact workload. Dana said she will not take the expansion to Hal Brenner until both are green, and asked for a tuned configuration and a soak test plan before the end of the month.", committedNextStep: "Vantage to deliver a tuned ingestion configuration and a 72 hour soak test plan by 2026-06-26", nextStepStatus: "delivered" },
      { callId: "GONG-917", callDate: "2026-07-02", title: "Security architecture review", participants: "Priya Nandakumar (Principal Security Architect), Marcus Rho (Director of Platform Engineering), Yusuf", transcript: "Priya took us through three items: customer-managed key enforcement on staged objects, data residency confirmation that no pilot data leaves eu-central-1, and SOC2 CC6.1 evidence for our own key rotation. She was constructive and said none of the three are unusual for a platform at this stage. She asked for a key management design document and a written residency attestation, and confirmed her team would verify against the pen test finding once received.", committedNextStep: "Vantage to supply the key management design doc and residency attestation by 2026-07-10", nextStepStatus: "delivered" },
      { callId: "GONG-934", callDate: "2026-07-14", title: "Platform team check-in", participants: "Marcus Rho (Director of Platform Engineering), Yusuf", transcript: "Marcus said his team has started a parallel technical evaluation and that an internal build on their existing Kafka and Flink stack is on the table as a serious option. He did not name any vendor or product. He was direct that the soak test abort and the unresolved failover behaviour are what put the build option back on the table, and he will not agree a re-run date until there is a root cause for the backpressure. Dana Whitfield did not attend and has not responded to three meeting invitations since 2026-06-26.", committedNextStep: null, nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-2207", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 4600000 }, { week: "2026-05-26", value: 5200000 }, { week: "2026-06-02", value: 6400000 }, { week: "2026-06-09", value: 7600000 }, { week: "2026-06-16", value: 8800000 }, { week: "2026-06-23", value: 9300000 }, { week: "2026-06-30", value: 9400000 }, { week: "2026-07-07", value: 9350000 }, { week: "2026-07-14", value: 9300000 } ], summary: "pilot ingest API volume climbed from 4.6M to 9.4M calls per week and then flattened within one percent for four consecutive weeks" },
      { usageId: "USG-2214", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 221 }, { week: "2026-05-26", value: 214 }, { week: "2026-06-02", value: 209 }, { week: "2026-06-09", value: 201 }, { week: "2026-06-16", value: 188 }, { week: "2026-06-23", value: 176 }, { week: "2026-06-30", value: 163 }, { week: "2026-07-07", value: 152 }, { week: "2026-07-14", value: 146 } ], summary: "weekly active seats fell from 221 to 146 against a contracted 250, down about 34 percent" },
    ],
  },

  {
    accountId: "ACC-3127",
    name: "Cobalt Sky Analytics",
    industry: "Marketing Technology",
    segment: "Mid-Market",
    arr: 0,
    seOwner: "Yusuf",
    slackChannel: "#acct-cobalt",
    situation: "Stalled technical evaluation. Performance exit criteria passed, networking and security criteria still open, evaluator silent since early June and the POC workload has stopped.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-3127-N",
          name: "Cobalt Sky - New Business (Platform Core + Ingest)",
          stage: "Proposal/Price Quote",
          amount: 175000,
          closeDate: "2026-06-30",
          nextStep: null,
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-3127-1", name: "Nathan Cole", title: "Director of Analytics Engineering", role: "champion", active: true },
        { contactId: "CON-3127-2", name: "Ivo Petrov", title: "Platform Engineer", role: "user", active: true },
        { contactId: "CON-3127-3", name: "Grace Lim", title: "IT Security Manager", role: "influencer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-3104", createdAt: "2026-05-19", subject: "POC: provision evaluation tenant and load sample dataset", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Provisioned the evaluation tenant in us-east and loaded the 40GB sample event dataset Cobalt supplied. Ivo confirmed the schema mapped cleanly. Resolved same day." },
      { ticketId: "ZD-3118", createdAt: "2026-05-27", subject: "SAML assertion rejected during Azure AD SSO setup", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "SSO logins failed with an assertion validation error. Cobalt's Azure AD was emitting group object ids where the connector expected group display names. Fixed with a claim transformation on their side. SCIM auto-provisioning was discussed but not configured during the trial." },
      { ticketId: "ZD-3126", createdAt: "2026-06-02", subject: "Raise burst rate limit for POC load test", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Lifted the burst ingest limit to 2000 requests per second on the evaluation tenant for a load test window running to 2026-06-12. Reverted to trial defaults afterwards." },
      { ticketId: "ZD-3141", createdAt: "2026-06-09", subject: "Can the ingest endpoint be reached over PrivateLink instead of the public endpoint", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Ivo asked whether ingest can run over AWS PrivateLink so no traffic traverses the public internet. Confirmed private ingest is available on the enterprise tier and needs a short scoping call to size the endpoint and subnet allocation. Offered three slots. No reply received." },
    ],
    calls: [
      { callId: "GONG-302", callDate: "2026-05-21", title: "POC kickoff and exit criteria", participants: "Nathan Cole, Ivo Petrov, P. Raman", transcript: "Agreed five written exit criteria for the POC: sustained ingest of 50k events per second, p95 query latency under 400ms on the rolling 90-day dataset, SSO through Azure AD, a private network path for ingest, and a passing security questionnaire. Ivo owns the load test on Cobalt's side and Nathan owns the internal write-up to his VP. Nathan said the evaluation needs to conclude before their Q3 planning cycle closes.", committedNextStep: "Vantage to run the load test with Ivo by 2026-06-12", nextStepStatus: "delivered" },
      { callId: "GONG-316", callDate: "2026-06-04", title: "POC mid-point readout", participants: "Nathan Cole, Ivo Petrov, Grace Lim, P. Raman", transcript: "The load test sustained 62k events per second and p95 query latency measured 310ms against the 90-day dataset, so both performance criteria passed and Ivo signed off on them in the shared tracker. Azure AD SSO worked after the group claim fix, though SCIM provisioning was never exercised. Grace said the security questionnaire sits behind two other reviews in her queue and gave no date. Nathan added that his platform team is finishing its own build versus buy assessment before he takes anything to his VP.", committedNextStep: "Nathan to share the internal assessment and a questionnaire date by 2026-06-19", nextStepStatus: "missed" },
    ],
    usage: [
      { usageId: "USG-3105", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 40000 }, { week: "2026-05-26", value: 180000 }, { week: "2026-06-02", value: 2600000 }, { week: "2026-06-09", value: 420000 }, { week: "2026-06-16", value: 90000 }, { week: "2026-06-23", value: 8000 }, { week: "2026-06-30", value: 0 }, { week: "2026-07-07", value: 0 }, { week: "2026-07-14", value: 0 } ], summary: "evaluation tenant API volume peaked at 2.6M during the June load test week then fell to zero from 2026-06-30" },
      { usageId: "USG-3106", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 2 }, { week: "2026-05-26", value: 5 }, { week: "2026-06-02", value: 6 }, { week: "2026-06-09", value: 4 }, { week: "2026-06-16", value: 2 }, { week: "2026-06-23", value: 1 }, { week: "2026-06-30", value: 0 }, { week: "2026-07-07", value: 0 }, { week: "2026-07-14", value: 0 } ], summary: "evaluation tenant active seats peaked at 6 during the load test week and reached zero from 2026-06-30" },
    ],
  },

  {
    accountId: "ACC-4210",
    name: "Foundry Labs",
    industry: "Software",
    segment: "Commercial",
    arr: 96000,
    seOwner: "Yusuf",
    slackChannel: "#acct-foundry",
    situation: "New logo in technical onboarding. Integration milestones landing on or ahead of schedule, usage ramping from zero, teething issues routine.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-4210-L",
          name: "Foundry - New Logo Land (Platform Core)",
          stage: "Closed Won",
          amount: 96000,
          closeDate: "2026-06-19",
          nextStep: null,
          riskFlag: "Commit",
        },
        {
          oppId: "OPP-4210-A",
          name: "Foundry - Streaming Ingest Add-on",
          stage: "Qualification",
          amount: 40000,
          closeDate: "2026-10-16",
          nextStep: "Streaming ingest scoping session on 2026-07-29",
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-4210-1", name: "Ravi Malhotra", title: "Head of Data Platform", role: "champion", active: true },
        { contactId: "CON-4210-2", name: "Ellen Park", title: "Staff Data Engineer", role: "user", active: true },
        { contactId: "CON-4210-3", name: "Dmitri Vasa", title: "Site Reliability Engineer", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-4106", createdAt: "2026-06-25", subject: "Terraform provider: workspace module fails on staging apply", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Dmitri hit a provider version mismatch applying the workspace module to staging. Pinned the provider to 2.11 and re-ran. Both production and staging workspaces applied cleanly and are now managed from Foundry's existing pipeline." },
      { ticketId: "ZD-4119", createdAt: "2026-07-02", subject: "Postgres CDC connector: replication slot lag during initial snapshot", priority: "P2", status: "resolved", slaBreached: false, csat: 5, body: "The initial snapshot on a 400GB orders table held the replication slot open long enough to build 6 hours of WAL on their primary. Enabled chunked snapshotting and set a slot size guard. Steady-state lag settled under 30 seconds." },
      { ticketId: "ZD-4133", createdAt: "2026-07-13", subject: "dbt Cloud webhook not triggering downstream refresh", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Post-run webhooks from dbt Cloud are not reaching the refresh endpoint. Signature validation fails because Foundry's egress proxy strips the timestamp header. Ellen is testing a header passthrough rule on their side and will confirm this week." },
    ],
    calls: [
      { callId: "GONG-407", callDate: "2026-06-22", title: "Implementation kickoff and architecture review", participants: "Ravi Malhotra, Ellen Park, Dmitri Vasa, P. Raman", transcript: "Walked the reference architecture against Foundry's stack: raw events land in S3, Postgres is the operational store, dbt handles transforms. Agreed three implementation milestones, staging workspace by June 26, first CDC pipeline in production by July 3, and 12 named users onboarded by July 31. Dmitri asked that all provisioning go through the Terraform provider so nothing is clicked in a console.", committedNextStep: "Vantage to share the Terraform module and reference architecture by 2026-06-24", nextStepStatus: "delivered" },
      { callId: "GONG-421", callDate: "2026-07-15", title: "Onboarding checkpoint", participants: "Ravi Malhotra, Ellen Park, P. Raman", transcript: "The first CDC pipeline went to production on July 2, a day ahead of the milestone, and 14 named users are onboarded against a target of 12. Ravi has been benchmarking end-to-end ingest lag against the in-house pipeline his team ran before and said the numbers are holding at roughly a third of what they used to see. He wants to scope streaming ingest for the event data still sitting in S3, and noted that budget for anything beyond the landed contract sits outside his team this year.", committedNextStep: "Streaming ingest scoping session on 2026-07-29", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-4108", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 0 }, { week: "2026-05-26", value: 0 }, { week: "2026-06-02", value: 0 }, { week: "2026-06-09", value: 0 }, { week: "2026-06-16", value: 0 }, { week: "2026-06-23", value: 4 }, { week: "2026-06-30", value: 8 }, { week: "2026-07-07", value: 12 }, { week: "2026-07-14", value: 14 } ], summary: "named active users ramped from 0 to 14 against an onboarding target of 12 by July 31" },
      { usageId: "USG-4109", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 0 }, { week: "2026-05-26", value: 0 }, { week: "2026-06-02", value: 0 }, { week: "2026-06-09", value: 0 }, { week: "2026-06-16", value: 0 }, { week: "2026-06-23", value: 90000 }, { week: "2026-06-30", value: 420000 }, { week: "2026-07-07", value: 980000 }, { week: "2026-07-14", value: 1400000 } ], summary: "API volume ramped from zero to 1.4M calls per week, with the steepest step in the two weeks after the first production pipeline" },
    ],
  },

  {
    accountId: "ACC-5163",
    name: "Atlas Manufacturing",
    industry: "Manufacturing",
    segment: "Enterprise",
    arr: 320000,
    seOwner: "Yusuf",
    slackChannel: "#acct-atlas",
    situation: "Platform stable, architectural fit in question. Atlas is migrating its analytics estate to Azure and has a new EU residency policy the current us-east deployment does not satisfy.",
    salesforce: {
      opportunities: [
        {
          oppId: "OPP-5163-R",
          name: "Atlas - FY26 Renewal + Azure Migration Scope",
          stage: "Negotiation/Review",
          amount: 320000,
          closeDate: "2026-08-07",
          nextStep: "Azure reference architecture review on 2026-07-23",
          riskFlag: null,
        },
      ],
      contacts: [
        { contactId: "CON-5163-1", name: "Karen Ives", title: "Director of Data Platform", role: "champion", active: true },
        { contactId: "CON-5163-2", name: "Anders Holm", title: "Enterprise Security Architect", role: "influencer", active: true },
        { contactId: "CON-5163-3", name: "Lena Brandt", title: "Cloud Platform Lead, EMEA", role: "influencer", active: true },
        { contactId: "CON-5163-4", name: "Bill Tran", title: "VP Infrastructure", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5102", createdAt: "2026-06-23", subject: "Which connectors are available in the Frankfurt region", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "Lena asked for the connector inventory in the EU region ahead of the EMEA plant cutover. Confirmed 14 of 19 connectors are generally available in Frankfurt. The SAP and Snowflake CDC connectors remain us-east only, with no committed EU date. Answer provided in writing." },
      { ticketId: "ZD-5115", createdAt: "2026-06-30", subject: "Azure Private Link support for the ingest endpoint", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Atlas requires private ingest in both target Azure regions and cannot route analytics traffic over public endpoints under their new network standard. AWS PrivateLink is GA today. Azure Private Link is on the roadmap without a committed date. Ticket held open pending the architecture review." },
      { ticketId: "ZD-5127", createdAt: "2026-07-07", subject: "p99 query latency rose from 480ms to 1.9s on the plant telemetry workspace", priority: "P1", status: "resolved", slaBreached: false, csat: 4, body: "Investigated a sharp p99 regression on the plant telemetry workspace. Traced to a cross-cloud round trip after Atlas relocated the EMEA plant telemetry source into Azure North Europe as a pre-migration pilot, while the workspace stayed in us-east. Advised colocating the read path. p99 returned to 610ms once Atlas moved the read replica. No platform-side fault found." },
      { ticketId: "ZD-5139", createdAt: "2026-07-14", subject: "Data residency: confirm at-rest and in-transit boundaries for EU plant data", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Anders requested written confirmation that EU plant telemetry never leaves the EU region, covering primary storage, backups, and any support engineer access path. Draft documentation prepared, held for legal review on the Vantage side before it can be sent." },
    ],
    calls: [
      { callId: "GONG-503", callDate: "2026-06-25", title: "Azure migration architecture review", participants: "Karen Ives, Lena Brandt, M. Alvarez", transcript: "Atlas is moving its analytics estate off AWS and onto Azure across the next three quarters, starting with the EMEA plants in Q4. Lena walked the target topology: Azure North Europe for EU workloads, Azure East US for everything else, private networking mandatory in both. The current us-east deployment sits outside that plan and Karen asked directly what a supported Azure path looks like and what it costs her team to get there.", committedNextStep: "Vantage to produce an Azure deployment options paper by 2026-07-06", nextStepStatus: "delivered" },
      { callId: "GONG-517", callDate: "2026-07-02", title: "Security and residency deep dive", participants: "Anders Holm, Karen Ives, M. Alvarez", transcript: "Anders is working to a new group policy that keeps EU plant telemetry inside the EU, including backups and any vendor support access. He asked for the key custody model and whether customer managed keys are supported in the EU region. He also pulled three open items from last year's pen test summary and asked for them to be restated against the current architecture. He took no position on the renewal itself.", committedNextStep: "Vantage to send residency and key custody documentation by 2026-07-13", nextStepStatus: "missed" },
      { callId: "GONG-528", callDate: "2026-07-16", title: "Renewal and roadmap checkpoint", participants: "Bill Tran, Karen Ives, M. Alvarez", transcript: "Bill said the platform has been stable and that reliability is not what he is weighing. His question is whether the architecture follows Atlas onto Azure inside the migration window his team has already committed to the board. Karen mentioned her platform group is standing up an internal lakehouse on Azure for raw plant telemetry. Nobody put a decision date on the renewal beyond the existing August close.", committedNextStep: "Azure reference architecture review on 2026-07-23", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-5104", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 119 }, { week: "2026-05-26", value: 118 }, { week: "2026-06-02", value: 120 }, { week: "2026-06-09", value: 119 }, { week: "2026-06-16", value: 121 }, { week: "2026-06-23", value: 118 }, { week: "2026-06-30", value: 119 }, { week: "2026-07-07", value: 117 }, { week: "2026-07-14", value: 118 } ], summary: "weekly active seats held flat between 117 and 121 against a contracted 130" },
      { usageId: "USG-5105", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 4190000 }, { week: "2026-05-26", value: 4200000 }, { week: "2026-06-02", value: 4180000 }, { week: "2026-06-09", value: 4150000 }, { week: "2026-06-16", value: 3900000 }, { week: "2026-06-23", value: 3600000 }, { week: "2026-06-30", value: 3350000 }, { week: "2026-07-07", value: 3150000 }, { week: "2026-07-14", value: 3050000 } ], summary: "API volume declined from 4.2M to 3.05M calls per week from mid-June, down about 27 percent" },
    ],
  },
];
