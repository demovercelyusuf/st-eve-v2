import type { AccountSeed } from "./types";

// Additional demo accounts that round the SE's patch out to the full set, authored to match the
// hand-written core accounts: six distinct archetypes (legacy migration, security-review gate,
// throughput ceiling on a scale account, edge fleet rollout, spiky seasonal workload, and a
// storage-bound research estate), each with a usage curve that matches its story.
export const GENERATED_ACCOUNTS: AccountSeed[] = [
  {
    accountId: "ACC-6001",
    name: "Lumen Retail Group",
    industry: "Retail / E-commerce",
    segment: "Enterprise",
    arr: 320000,
    seOwner: "Yusuf",
    slackChannel: "#acct-lumen-retail",
    situation:
      "Phased migration off an ageing on-prem Oracle and Informatica stack. Phase 1 domains are live and reconciling, Phase 2 has moved right, and the open technical question is how much of the cutover Lumen's own platform team can absorb.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-6001-A", name: "Lumen Retail: On-Prem Migration Phase 2 (Orders, Inventory, Pricing)", stage: "Negotiation/Review", amount: 320000, closeDate: "2026-09-04", nextStep: "Re-baselined Phase 2 cutover runbook due 2026-07-24", riskFlag: null },
      ],
      contacts: [
        { contactId: "CON-6001-1", name: "Helena Voss", title: "VP Data Platform", role: "champion", active: true },
        { contactId: "CON-6001-2", name: "Marcus Lee", title: "Principal Platform Engineer", role: "influencer", active: true },
        { contactId: "CON-6001-3", name: "Dev Sundaram", title: "Enterprise Architect", role: "influencer", active: true },
        { contactId: "CON-6001-4", name: "Gordon Achebe", title: "VP Retail Technology", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5149", createdAt: "2026-06-08", subject: "Oracle CDC connector drops LOB columns on resync", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "Change-data-capture from the legacy Oracle order store silently omitted CLOB and BLOB columns whenever a resync was triggered. Reproduced on the 11.2 source, patched the connector, and the customer re-ran the affected partitions cleanly." },
      { ticketId: "ZD-5172", createdAt: "2026-06-22", subject: "Historical backfill of 4.1B order rows exceeds the weekend batch window", priority: "P2", status: "resolved", slaBreached: false, csat: 5, body: "The full three-year order history did not complete inside the 52 hour weekend window. Split the load into 14 partition-aligned chunks and raised parallelism to 24 writers, which brought the run to 31 hours." },
      { ticketId: "ZD-5188", createdAt: "2026-07-06", subject: "Dual-run reconciliation mismatch on the inventory fact table", priority: "P2", status: "open", slaBreached: false, csat: null, body: "During dual-run, roughly 0.4 percent of inventory rows differ between the legacy warehouse and Vantage, concentrated in adjustments posted after 22:00 local. Investigating a timezone handling difference in the legacy extract. Still open." },
    ],
    calls: [
      { callId: "GONG-944", callDate: "2026-06-11", title: "Phase 2 migration architecture review", participants: "Helena Voss, Marcus Lee, Dev Sundaram, Yusuf", transcript: "Walked the Phase 2 target architecture covering orders, inventory and pricing, with a dual-run period of four weeks per domain before the legacy extracts are retired. Marcus said his platform group is two engineers, both of whom are also carrying the point-of-sale replatform through Q3. Dev raised the question of whether the reconciliation layer should live in Vantage or stay in their existing control framework, and asked for a written runbook before committing.", committedNextStep: "Vantage to deliver the Phase 2 cutover runbook by 2026-06-26", nextStepStatus: "delivered" },
      { callId: "GONG-961", callDate: "2026-07-09", title: "Dual-run reconciliation checkpoint", participants: "Helena Voss, Marcus Lee, Yusuf", transcript: "Helena confirmed the Phase 2 cutover date has moved from 2026-08-03 to 2026-09-14 and asked us to re-baseline the runbook against the new date. Marcus walked through the inventory reconciliation gap tracked in ZD-5188 and said he is comfortable it is an extract-side timezone issue rather than an ingestion defect. Dev Sundaram was invited and did not attend, and no apology or reason was logged. Helena remains positive on Phase 1 and cited the orders domain running for six weeks without an incident.", committedNextStep: "Vantage to re-baseline the Phase 2 cutover runbook against the September date by 2026-07-24", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-6001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 40 }, { week: "2026-05-26", value: 58 }, { week: "2026-06-02", value: 74 }, { week: "2026-06-09", value: 92 }, { week: "2026-06-16", value: 108 }, { week: "2026-06-23", value: 118 }, { week: "2026-06-30", value: 124 }, { week: "2026-07-07", value: 128 }, { week: "2026-07-14", value: 130 } ], summary: "active seats grew from 40 to 130 as the Phase 1 domains cut over, flattening from late June" },
      { usageId: "USG-6002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 900000 }, { week: "2026-05-26", value: 1600000 }, { week: "2026-06-02", value: 2600000 }, { week: "2026-06-09", value: 3900000 }, { week: "2026-06-16", value: 5300000 }, { week: "2026-06-23", value: 6600000 }, { week: "2026-06-30", value: 7300000 }, { week: "2026-07-07", value: 7400000 }, { week: "2026-07-14", value: 7400000 } ], summary: "weekly API volume ramped from 0.9M to 7.4M as Phase 1 workloads moved, then held flat for three weeks" },
    ],
  },
  {
    accountId: "ACC-7001",
    name: "Sentinel Payments",
    industry: "Financial Services (Payments)",
    segment: "Enterprise",
    arr: 0,
    seOwner: "Yusuf",
    slackChannel: "#acct-sentinel-pmts",
    situation:
      "New logo in a regulated environment. The functional evaluation passed its exit criteria, and the remaining work is security review findings, EU data residency evidence and key custody.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-7001-A", name: "Sentinel Payments: Platform Adoption (EU and US Regions)", stage: "Proposal/Price Quote", amount: 480000, closeDate: "2026-09-30", nextStep: "Return the completed CAIQ and pen test remediation evidence by 2026-07-24", riskFlag: "At Risk" },
      ],
      contacts: [
        { contactId: "CON-7001-1", name: "Aisha Rahman", title: "Staff Data Engineer", role: "champion", active: true },
        { contactId: "CON-7001-2", name: "Tom Buckley", title: "Security Architect", role: "influencer", active: true },
        { contactId: "CON-7001-3", name: "Elena Sorokin", title: "VP Engineering", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5141", createdAt: "2026-06-02", subject: "Request: SOC 2 Type II report and latest third-party pen test summary", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Sentinel's vendor review team requested the current SOC 2 Type II report and the most recent third-party penetration test summary. Both shared under NDA. Their reviewers came back with two follow-up questions on the remediation status of the medium findings, which remain unanswered." },
      { ticketId: "ZD-5164", createdAt: "2026-06-17", subject: "Data residency: confirm EU workloads stay in-region during a failover", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Tom Buckley asked for written confirmation that EU cardholder-adjacent data never leaves the EU during a regional failover. Confirmed that failover targets a secondary EU zone only, but our published DR runbook does not yet state it explicitly, so the customer is holding the item open until the runbook is updated." },
      { ticketId: "ZD-5192", createdAt: "2026-07-07", subject: "Customer-managed keys: HSM-backed custody and 90 day rotation", priority: "P2", status: "escalated", slaBreached: false, csat: null, body: "Security review raised customer-managed encryption keys with HSM-backed custody and a 90 day rotation policy. Escalated to product: envelope encryption with customer-supplied keys is on the roadmap but not generally available, and no committed date has been given to the customer." },
    ],
    calls: [
      { callId: "GONG-941", callDate: "2026-06-05", title: "Security architecture review", participants: "Tom Buckley, Aisha Rahman, Yusuf", transcript: "Tom walked his threat model against our reference architecture and logged three findings: customer-managed key custody, audit log streaming into their Splunk instance, and confirmation that TLS 1.2 endpoints are retired. Aisha confirmed the functional evaluation closed out all seven exit criteria including the 40 million row settlement reconciliation test, which ran in 11 minutes against their 30 minute target. Tom asked for the CAIQ and the pen test remediation evidence before he would move the review to a recommendation.", committedNextStep: "Vantage to return the completed CAIQ and pen test remediation evidence by 2026-06-19", nextStepStatus: "missed" },
      { callId: "GONG-964", callDate: "2026-07-13", title: "Compliance evidence follow-up", participants: "Elena Sorokin, Aisha Rahman, Yusuf", transcript: "Elena said signature has moved past the July approval cycle into the next one. Aisha reported that Tom's review is still open on the key custody finding, that the audit log streaming item was closed after the Splunk HEC integration was demonstrated, and that the TLS 1.2 item was closed against the published endpoint deprecation notice. Elena asked what the technical onboarding timeline looks like once paper is signed and said she wants the EU region live before the end of the calendar year.", committedNextStep: "Vantage to return the completed CAIQ and pen test remediation evidence by 2026-07-24", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-7001", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 8 }, { week: "2026-05-26", value: 11 }, { week: "2026-06-02", value: 13 }, { week: "2026-06-09", value: 14 }, { week: "2026-06-16", value: 15 }, { week: "2026-06-23", value: 15 }, { week: "2026-06-30", value: 14 }, { week: "2026-07-07", value: 14 }, { week: "2026-07-14", value: 14 } ], summary: "evaluation sandbox seats rose from 8 to 15 and have held near 14 through the security review" },
      { usageId: "USG-7002", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 240000 }, { week: "2026-05-26", value: 380000 }, { week: "2026-06-02", value: 520000 }, { week: "2026-06-09", value: 610000 }, { week: "2026-06-16", value: 640000 }, { week: "2026-06-23", value: 600000 }, { week: "2026-06-30", value: 590000 }, { week: "2026-07-07", value: 605000 }, { week: "2026-07-14", value: 600000 } ], summary: "sandbox API volume plateaued near 0.6M per week after the reconciliation test completed" },
    ],
  },
  {
    accountId: "ACC-8001",
    name: "Granite Peak Energy",
    industry: "Energy and Utilities",
    segment: "Enterprise",
    arr: 540000,
    seOwner: "Yusuf",
    slackChannel: "#acct-granite-peak",
    situation:
      "Scale account. Grid telemetry ingest is running against a measured throughput ceiling, and a Tier 4 expansion hangs on a joint load test proving headroom for the winter peak.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-8001-A", name: "Granite Peak: Grid Telemetry Expansion (Tier 4 Ingest)", stage: "Proposal/Price Quote", amount: 380000, closeDate: "2026-09-18", nextStep: "Joint load test to 1.2M events per second on 2026-07-29", riskFlag: null },
        { oppId: "OPP-8001-B", name: "Granite Peak: FY26 Renewal", stage: "Closed Won", amount: 540000, closeDate: "2026-06-30", nextStep: null, riskFlag: "Commit" },
      ],
      contacts: [
        { contactId: "CON-8001-1", name: "Nadia Kessler", title: "Director of Grid Data Systems", role: "champion", active: true },
        { contactId: "CON-8001-2", name: "Rob Farrow", title: "Principal Data Engineering Lead", role: "influencer", active: true },
        { contactId: "CON-8001-3", name: "Craig Bettis", title: "VP Operations Technology", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5160", createdAt: "2026-06-15", subject: "Ingest backpressure above 640k events per second on the SCADA topic", priority: "P1", status: "resolved", slaBreached: true, csat: 3, body: "Sustained SCADA ingest above roughly 640k events per second triggered consumer lag and backpressure into their collectors, with 90 minutes of delayed telemetry before mitigation. Rebalanced partitions from 96 to 240 and the cluster now holds a sustained 680k events per second. First response missed the P1 target by four hours." },
      { ticketId: "ZD-5181", createdAt: "2026-06-29", subject: "p99 latency on the 90 day telemetry rollup exceeds 4 seconds", priority: "P2", status: "open", slaBreached: false, csat: null, body: "The 90 day substation rollup returns at p95 1.4 seconds and p99 4.6 seconds against Granite Peak's internal 2 second target. Reproduced on their cluster. Candidate fixes under review are a pre-aggregated daily rollup and a change to the partition pruning strategy. Still open." },
      { ticketId: "ZD-5202", createdAt: "2026-07-12", subject: "Request: benchmark harness and sizing guidance for 1.2M events per second", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Rob asked for the replay harness and a documented sizing model so his team can run the load test on their own infrastructure. Shipped the harness, the cluster sizing worksheet and the recommended broker and writer counts for the 1.2M events per second target." },
    ],
    calls: [
      { callId: "GONG-948", callDate: "2026-06-18", title: "Throughput ceiling review", participants: "Rob Farrow, Nadia Kessler, P. Raman", transcript: "Rob presented the measurements from the June 15 incident showing a sustained ceiling around 680k events per second on the current cluster shape before consumer lag builds. Granite Peak's forecast for the winter peak is 1.1M events per second across 34 substations, with a short duration burst target of 1.2M. Nadia said the expansion case rests on demonstrating that headroom rather than on price. Agreed we would produce a sizing model for the 1.2M target.", committedNextStep: "Vantage to deliver a sizing model for 1.2M events per second by 2026-07-02", nextStepStatus: "delivered" },
      { callId: "GONG-966", callDate: "2026-07-14", title: "Load test planning", participants: "Rob Farrow, Craig Bettis, P. Raman", transcript: "Agreed a joint load test on 2026-07-29 replaying 14 days of captured SCADA traffic at two times speed, with pass criteria of 1.2M events per second sustained for 30 minutes at under 5 seconds end to end lag. Craig confirmed the Tier 4 purchase decision follows the load test result and that budget is already provisioned in the operations technology plan. Rob asked that the rollup latency work tracked in ZD-5181 stay on a separate track so it does not gate the test.", committedNextStep: "Joint load test to 1.2M events per second on 2026-07-29", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-8001", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 312000000 }, { week: "2026-05-26", value: 338000000 }, { week: "2026-06-02", value: 361000000 }, { week: "2026-06-09", value: 389000000 }, { week: "2026-06-16", value: 412000000 }, { week: "2026-06-23", value: 431000000 }, { week: "2026-06-30", value: 441000000 }, { week: "2026-07-07", value: 444000000 }, { week: "2026-07-14", value: 445000000 } ], summary: "weekly ingest API volume rose from 312M to 445M calls and has flattened since the partition rebalance" },
      { usageId: "USG-8002", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 84 }, { week: "2026-05-26", value: 86 }, { week: "2026-06-02", value: 88 }, { week: "2026-06-09", value: 89 }, { week: "2026-06-16", value: 91 }, { week: "2026-06-23", value: 93 }, { week: "2026-06-30", value: 94 }, { week: "2026-07-07", value: 95 }, { week: "2026-07-14", value: 96 } ], summary: "active seats grew modestly from 84 to 96, steady operational usage" },
    ],
  },
  {
    accountId: "ACC-9001",
    name: "Vireo Robotics",
    industry: "Industrial Robotics",
    segment: "Mid-Market",
    arr: 145000,
    seOwner: "Yusuf",
    slackChannel: "#acct-vireo",
    situation:
      "Edge deployment with an unusual topology: agents on ARM gateways across a 40 plant estate with no inbound connectivity. Phase 2 rollout is paused on an unexplained latency gap between two pilot sites.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-9001-A", name: "Vireo: Edge Fleet Rollout Phase 2 (34 sites)", stage: "Proposal/Price Quote", amount: 210000, closeDate: "2026-09-25", nextStep: "Joint packet capture and profiling session at Leon on 2026-07-22", riskFlag: null },
      ],
      contacts: [
        { contactId: "CON-9001-1", name: "Sanne de Vries", title: "Head of Robotics Platform", role: "champion", active: true },
        { contactId: "CON-9001-2", name: "Tobias Krall", title: "Site Reliability Lead", role: "influencer", active: true },
        { contactId: "CON-9001-3", name: "Marisol Pena", title: "Plant IT Manager, Leon", role: "user", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5152", createdAt: "2026-06-10", subject: "Edge agent buffers fill during WAN outages longer than 40 minutes", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "Store-and-forward buffering was sized for 30 minutes at 2,000 messages per second, so the Duluth plant lost telemetry during a 70 minute carrier outage. Moved buffering to a disk-backed queue sized for four hours and confirmed replay on reconnect." },
      { ticketId: "ZD-5177", createdAt: "2026-06-26", subject: "Plant firewall blocks agent egress, need static egress addresses", priority: "P2", status: "resolved", slaBreached: false, csat: 5, body: "Vireo's plant networks permit only allowlisted outbound destinations and no inbound connections at all. Supplied the static egress ranges for their region plus a forward proxy configuration for sites that require inspection. All six pilot sites revalidated successfully." },
      { ticketId: "ZD-5199", createdAt: "2026-07-11", subject: "Control-loop round trip over 90ms at the Leon site", priority: "P1", status: "escalated", slaBreached: true, csat: null, body: "Leon reports 92ms p95 round trip on the inference control loop against a 25ms target. The Duluth site measures 18ms p95 on the same agent build and the same model version. Escalated to engineering, open past the P1 response target with no cause isolated yet." },
    ],
    calls: [
      { callId: "GONG-951", callDate: "2026-06-24", title: "Edge topology and deployment review", participants: "Sanne de Vries, Tobias Krall, P. Raman", transcript: "Vireo operates 40 plants on ARM64 gateways with no inbound connectivity and no ability to accept a managed agent installer, so every deployment must go through their own Ansible pipeline and signed artifact repository. Tobias set a hard constraint of under 512MB resident memory per agent because the gateways also run the vision stack. Sanne confirmed the Phase 2 business case is approved internally and depends on the six pilot sites, Leon and Duluth among them, holding the 25ms control-loop target.", committedNextStep: "Vantage to publish an ARM64 agent build and a documented resource profile by 2026-07-06", nextStepStatus: "delivered" },
      { callId: "GONG-967", callDate: "2026-07-15", title: "Leon latency escalation", participants: "Tobias Krall, Marisol Pena, P. Raman", transcript: "Reviewed the 92ms p95 at Leon against 18ms at Duluth on identical agent and model builds. Marisol noted that Leon runs the older Gen2 gateway hardware and that the site backhauls through a regional network hub rather than connecting directly, and Tobias said neither has been isolated yet. Tobias did confirm the delivered ARM64 build is holding at 380MB resident across the pilot gateways, inside his 512MB ceiling. Sanne has paused the Phase 2 rollout to the remaining 34 sites until the Leon number is understood. Agreed a joint packet capture and profiling session on site.", committedNextStep: "Joint packet capture and profiling session at Leon on 2026-07-22", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-9001", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 9800000 }, { week: "2026-05-26", value: 10400000 }, { week: "2026-06-02", value: 11200000 }, { week: "2026-06-09", value: 12100000 }, { week: "2026-06-16", value: 12600000 }, { week: "2026-06-23", value: 12900000 }, { week: "2026-06-30", value: 13100000 }, { week: "2026-07-07", value: 13000000 }, { week: "2026-07-14", value: 12800000 } ], summary: "edge ingest API volume grew from 9.8M to 13.1M calls per week and levelled off when the Phase 2 rollout paused" },
      { usageId: "USG-9002", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 22 }, { week: "2026-05-26", value: 23 }, { week: "2026-06-02", value: 24 }, { week: "2026-06-09", value: 25 }, { week: "2026-06-16", value: 26 }, { week: "2026-06-23", value: 26 }, { week: "2026-06-30", value: 26 }, { week: "2026-07-07", value: 25 }, { week: "2026-07-14", value: 26 } ], summary: "active seats flat near 26, a small platform team operating a large fleet" },
    ],
  },
  {
    accountId: "ACC-10001",
    name: "Tallgrass Media",
    industry: "Media and Entertainment",
    segment: "Mid-Market",
    arr: 180000,
    seOwner: "Yusuf",
    slackChannel: "#acct-tallgrass",
    situation:
      "Spiky seasonal workload. Baseline query volume is modest but ratings and holiday peaks are several times higher, and the renewal conversation has turned into a cost per query and capacity shape discussion.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-10001-A", name: "Tallgrass: FY26 Renewal and Capacity Reshape", stage: "Negotiation/Review", amount: 180000, closeDate: "2026-08-21", nextStep: "Reserved-capacity model and query cost review by 2026-07-25", riskFlag: null },
      ],
      contacts: [
        { contactId: "CON-10001-1", name: "Jonah Weeks", title: "Director of Data Engineering", role: "champion", active: true },
        { contactId: "CON-10001-2", name: "Lena Ortiz", title: "Analytics Engineering Manager", role: "user", active: true },
        { contactId: "CON-10001-3", name: "Priyanka Bhatt", title: "Director of Technology Finance", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5155", createdAt: "2026-06-11", subject: "Query queue depth during the Sunday night ratings load", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "Concurrency slots were exhausted for roughly three hours on Sunday evening with about 9,000 queries submitted and p95 queue wait at 47 seconds. Raised the concurrency limit for the reporting workgroup and moved the overnight refresh out of the window." },
      { ticketId: "ZD-5169", createdAt: "2026-06-20", subject: "Explain cost attribution on the ad-hoc warehouse", priority: "P3", status: "resolved", slaBreached: false, csat: 5, body: "Provided a per-query cost breakdown for the ad-hoc warehouse. Twelve recurring queries accounted for 61 percent of compute spend, nine of them full scans of the impressions table with no partition predicate." },
      { ticketId: "ZD-5194", createdAt: "2026-07-08", subject: "Autoscaling did not keep up with the holiday weekend spike", priority: "P2", status: "open", slaBreached: false, csat: null, body: "Scale-up took about six minutes against a demand ramp that reached peak in roughly 90 seconds, so queries queued at the front of the July 4 spike. Evaluating a pre-warmed capacity floor for scheduled event windows. Still open." },
    ],
    calls: [
      { callId: "GONG-950", callDate: "2026-06-23", title: "Cost per query working session", participants: "Jonah Weeks, Lena Ortiz, M. Alvarez", transcript: "Reviewed the twelve queries carrying 61 percent of compute spend and agreed on materialised daily rollups for the impressions table plus result caching on the two dashboards that refresh every five minutes. Lena estimated the rollups would remove most of the full scans. Jonah said finance is asking him for a defensible cost per query figure he can put into next year's budget.", committedNextStep: "Vantage to deliver a rollup plan by 2026-07-06", nextStepStatus: "delivered" },
      { callId: "GONG-969", callDate: "2026-07-16", title: "Renewal and capacity reshape", participants: "Priyanka Bhatt, Jonah Weeks, M. Alvarez", transcript: "Priyanka asked what a reserved-capacity floor would have to look like to carry the ordinary weeks without paying all year for the peaks. Worked it against the last nine weeks of volume: a floor around 4.2M queries per week covers every non-event week, and the two event weeks at 5.9M and 11.4M need burst on top. The harder problem is shape rather than size, since the July 4 demand ramp reached peak in about 90 seconds while scale-up currently takes about six minutes, so a burst tier only helps if capacity is pre-warmed into a scheduled window. Priyanka asked what the burst tier costs per query at that shape and how other platforms structure the same split. Jonah confirmed the platform itself is not in question and that the rollups have already reduced the Sunday peak.", committedNextStep: "Reserved-capacity model and query cost review by 2026-07-25", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-10001", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 3200000 }, { week: "2026-05-26", value: 3400000 }, { week: "2026-06-02", value: 3150000 }, { week: "2026-06-09", value: 5900000 }, { week: "2026-06-16", value: 3600000 }, { week: "2026-06-23", value: 3500000 }, { week: "2026-06-30", value: 11400000 }, { week: "2026-07-07", value: 4200000 }, { week: "2026-07-14", value: 3600000 } ], summary: "weekly query volume sits near 3.5M with seasonal spikes to 5.9M in the ratings week and 11.4M over the holiday weekend" },
      { usageId: "USG-10002", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 62 }, { week: "2026-05-26", value: 64 }, { week: "2026-06-02", value: 63 }, { week: "2026-06-09", value: 71 }, { week: "2026-06-16", value: 66 }, { week: "2026-06-23", value: 65 }, { week: "2026-06-30", value: 78 }, { week: "2026-07-07", value: 68 }, { week: "2026-07-14", value: 66 } ], summary: "active seats hold near 65 and rise into the low 70s during peak editorial weeks" },
    ],
  },
  {
    accountId: "ACC-11001",
    name: "Harborview Genomics",
    industry: "Biotechnology and Genomics",
    segment: "Enterprise",
    arr: 260000,
    seOwner: "Yusuf",
    slackChannel: "#acct-harborview",
    situation:
      "Very large cohort datasets and multi-day pipelines. Storage tiering, cold restore latency and cross-region egress are the live technical constraints, and job submissions have dropped since early July.",
    salesforce: {
      opportunities: [
        { oppId: "OPP-11001-A", name: "Harborview: Cohort Analytics Expansion (Object Tier and Egress)", stage: "Proposal/Price Quote", amount: 290000, closeDate: "2026-10-02", nextStep: "Storage tiering and egress design review on 2026-07-30", riskFlag: null },
      ],
      contacts: [
        { contactId: "CON-11001-1", name: "Amara Osei", title: "Head of Computational Biology", role: "champion", active: true },
        { contactId: "CON-11001-2", name: "Ben Halloran", title: "Research Platform Engineering Lead", role: "influencer", active: true },
        { contactId: "CON-11001-3", name: "Grete Lindqvist", title: "Director of Research IT", role: "economic_buyer", active: true },
      ],
    },
    tickets: [
      { ticketId: "ZD-5144", createdAt: "2026-06-03", subject: "Variant-calling job at 38 hours hits the 24 hour job ceiling", priority: "P2", status: "resolved", slaBreached: false, csat: 4, body: "A whole-genome variant-calling run across 9,400 samples exceeded the 24 hour maximum job duration and was killed twice. Split the pipeline into four checkpointed stages with resumable state, and the customer completed a full run in three stages of under 14 hours each." },
      { ticketId: "ZD-5166", createdAt: "2026-06-18", subject: "Cross-region egress charges on the 412TB cohort transfer", priority: "P2", status: "resolved", slaBreached: false, csat: 3, body: "Harborview moved a 412TB cohort between regions and the egress line came in well above the figure their team had modelled. Walked through the billing detail, confirmed the charges were correct, and documented an in-region staging pattern that avoids the transfer for future cohorts." },
      { ticketId: "ZD-5189", createdAt: "2026-07-06", subject: "Cold-tier restore latency on archived BAM files", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Restores from the cold object tier are taking eight to twelve hours against the team's working expectation of under one hour. Confirmed the behaviour is within the tier's published retrieval window. Customer has asked whether an intermediate tier exists. Still open." },
      { ticketId: "ZD-5207", createdAt: "2026-07-14", subject: "Request: storage tiering guidance for the 2.4PB cohort archive", priority: "P3", status: "open", slaBreached: false, csat: null, body: "Ben requested a written tiering recommendation across hot, warm and cold for the 2.4PB archive, including expected restore times per tier and the egress implications of the in-region staging pattern. Awaiting the design review." },
    ],
    calls: [
      { callId: "GONG-953", callDate: "2026-06-26", title: "Storage architecture and job runtime review", participants: "Amara Osei, Ben Halloran, M. Alvarez", transcript: "Harborview holds a 2.4PB cohort archive of which roughly 70 percent has not been read in 12 months, and Ben wants a tiering design that keeps restore times predictable for the samples that do get recalled. Amara described the analysis pattern as a small number of very long pipelines rather than many short queries, so job durability matters more to her than concurrency. Agreed to produce a tiering and egress model covering the three tiers and the in-region staging pattern.", committedNextStep: "Vantage to deliver a storage tiering and egress model by 2026-07-10", nextStepStatus: "missed" },
      { callId: "GONG-971", callDate: "2026-07-17", title: "Egress and tiering follow-up", participants: "Grete Lindqvist, Ben Halloran, M. Alvarez", transcript: "Grete said the expansion has to fit inside a flat research infrastructure budget and mentioned that a grant renewal decision lands in September. Ben noted that pipeline submissions have fallen since the first week of July. He also asked again about an intermediate storage tier, referencing the eight to twelve hour cold restores. Agreed a design review at the end of the month to close out both the tiering model and the restore expectations.", committedNextStep: "Storage tiering and egress design review on 2026-07-30", nextStepStatus: "none" },
    ],
    usage: [
      { usageId: "USG-11001", metricName: "api_calls_weekly", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 2800000 }, { week: "2026-05-26", value: 3100000 }, { week: "2026-06-02", value: 2950000 }, { week: "2026-06-09", value: 3200000 }, { week: "2026-06-16", value: 3050000 }, { week: "2026-06-23", value: 2900000 }, { week: "2026-06-30", value: 1900000 }, { week: "2026-07-07", value: 1250000 }, { week: "2026-07-14", value: 980000 } ], summary: "weekly pipeline API volume held near 3.0M then fell to 0.98M from the end of June" },
      { usageId: "USG-11002", metricName: "active_seats", periodStart: "2026-05-19", periodEnd: "2026-07-14", series: [ { week: "2026-05-19", value: 48 }, { week: "2026-05-26", value: 49 }, { week: "2026-06-02", value: 47 }, { week: "2026-06-09", value: 50 }, { week: "2026-06-16", value: 48 }, { week: "2026-06-23", value: 47 }, { week: "2026-06-30", value: 41 }, { week: "2026-07-07", value: 36 }, { week: "2026-07-14", value: 33 } ], summary: "active seats slipped from 48 to 33 over the last three weeks" },
    ],
  },
];
