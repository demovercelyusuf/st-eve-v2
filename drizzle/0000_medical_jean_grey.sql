CREATE TABLE IF NOT EXISTS "brief_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text,
	"account_id" text NOT NULL,
	"status" text NOT NULL,
	"grounded" boolean,
	"grounded_claims" integer,
	"dropped_claims" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_run_id" uuid NOT NULL,
	"claim" text NOT NULL,
	"activity_id" text,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "model_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"step_index" integer NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cache_read_tokens" integer,
	"cost_usd" real,
	"generation_id" text,
	"finish_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slack_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"brief_run_id" uuid,
	"channel" text NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "citations" ADD CONSTRAINT "citations_brief_run_id_brief_runs_id_fk" FOREIGN KEY ("brief_run_id") REFERENCES "public"."brief_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "slack_deliveries" ADD CONSTRAINT "slack_deliveries_brief_run_id_brief_runs_id_fk" FOREIGN KEY ("brief_run_id") REFERENCES "public"."brief_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brief_runs_account_idx" ON "brief_runs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "brief_runs_session_idx" ON "brief_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "citations_brief_idx" ON "citations" USING btree ("brief_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_runs_session_idx" ON "model_runs" USING btree ("session_id");
