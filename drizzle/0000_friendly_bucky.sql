CREATE TABLE "brief_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"status" text NOT NULL,
	"grounded" boolean,
	"grounded_claims" integer,
	"dropped_claims" integer,
	"model" text,
	"cost_usd" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_run_id" uuid NOT NULL,
	"claim" text NOT NULL,
	"activity_id" text,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_run_id" uuid NOT NULL,
	"attempt" integer NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" real,
	"latency_ms" integer,
	"failed_over" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"brief_run_id" uuid,
	"channel" text NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_brief_run_id_brief_runs_id_fk" FOREIGN KEY ("brief_run_id") REFERENCES "public"."brief_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_runs" ADD CONSTRAINT "model_runs_brief_run_id_brief_runs_id_fk" FOREIGN KEY ("brief_run_id") REFERENCES "public"."brief_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_deliveries" ADD CONSTRAINT "slack_deliveries_brief_run_id_brief_runs_id_fk" FOREIGN KEY ("brief_run_id") REFERENCES "public"."brief_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brief_runs_account_idx" ON "brief_runs" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "citations_brief_idx" ON "citations" USING btree ("brief_run_id");--> statement-breakpoint
CREATE INDEX "model_runs_brief_idx" ON "model_runs" USING btree ("brief_run_id");