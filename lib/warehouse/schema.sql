-- Vantage account-activity warehouse. In production this is the customer's own warehouse in
-- AWS us-east-1; here it is stood up as a Postgres database the copilot reads across the boundary.
-- Two schemas share the database:
--   activity: the cross-system account history the copilot reads in bulk (tickets, calls, usage)
--   sfdc:     a mock of the live Salesforce CRM, read one record at a time via the SFDC adapter
-- Reseeds are clean: both schemas are dropped and rebuilt.

drop schema if exists activity cascade;
drop schema if exists sfdc cascade;
create schema activity;
create schema sfdc;

-- Account dimension shared by every activity table.
create table activity.dim_account (
  account_id    text primary key,
  name          text not null,
  industry      text not null,
  segment       text,
  arr           integer not null,
  se_owner      text not null,
  slack_channel text
);

-- Gong-shaped call notes. call_id is the citable activity id (GONG-###).
create table activity.gong_calls (
  call_id             text primary key,
  account_id          text not null references activity.dim_account(account_id),
  call_date           date not null,
  title               text not null,
  participants        text,
  transcript          text not null,
  committed_next_step text,
  next_step_status    text             -- delivered | missed | none
);

-- Weekly product-usage rollups as a metric series. usage_id is the citable activity id (USG-####).
create table activity.product_usage (
  usage_id     text primary key,
  account_id   text not null references activity.dim_account(account_id),
  metric_name  text not null,          -- active_seats | api_calls_weekly
  period_start date not null,
  period_end   date not null,
  series       jsonb not null,         -- [{ "week": "2026-05-19", "value": 238 }, ...]
  summary      text not null
);

-- The account-activity mart: one citable row per activity, unioned into a single timeline.
-- Modeled as a view so the source tables stay the single source of truth (dbt would build this).
create view activity.fct_account_activity as
    select call_id as activity_id, account_id, 'call'::text as activity_type,
           call_date as occurred_at, title as summary, transcript as detail
      from activity.gong_calls
  union all
    select usage_id, account_id, 'usage'::text,
           period_end, summary, null
      from activity.product_usage;

-- Mock Salesforce CRM. Read live through the SFDC adapter, never through the warehouse read path.
create table sfdc.accounts (
  account_id text primary key,
  name       text not null,
  industry   text,
  owner_se   text
);

create table sfdc.opportunities (
  opp_id     text primary key,         -- OPP-####
  account_id text not null references sfdc.accounts(account_id),
  name       text not null,
  stage      text not null,            -- Salesforce stage label
  amount     integer not null,
  close_date date,
  next_step  text,
  risk_flag  text                      -- At Risk | Commit | null
);

create table sfdc.contacts (
  contact_id text primary key,
  account_id text not null references sfdc.accounts(account_id),
  name       text not null,
  title      text not null,
  role       text,                     -- champion | economic_buyer | influencer | user | blocker
  active     boolean not null default true
);

-- Re-grant the dynamic reader's privileges. This file drops both schemas at the top, and a drop
-- takes every grant on them with it, so without this block a reseed silently disarms Vault: it can
-- still mint a role, that role still connects, and every query it runs comes back permission denied.
-- The failure surfaces as a 500 in the product rather than as an error in the seed, which is the
-- worst possible place to find out.
--
-- steve_reader itself is created once by terraform/bootstrap/01-vault-admin.sql. Only the grants
-- need restoring here, and the guard means the seed still runs on a database where Vault was never
-- set up (local dev against a scratch Postgres, for instance).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'steve_reader') then
    grant usage on schema activity, sfdc to steve_reader;
    grant select on all tables in schema activity, sfdc to steve_reader;
    alter default privileges in schema activity, sfdc grant select on tables to steve_reader;
  end if;
end
$$;

-- Note for whoever hits this next: readers minted before a reseed keep working until their lease
-- expires, because the role still exists and the grants above are restored underneath it. A reader
-- minted during the window between the drop and this block will fail. It self-heals within one TTL.
