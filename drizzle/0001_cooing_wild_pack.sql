CREATE TABLE IF NOT EXISTS "evidence" (
	"session_id" text NOT NULL,
	"citation_id" text NOT NULL,
	"account_id" text NOT NULL,
	"source" text NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_session_id_citation_id_pk" PRIMARY KEY("session_id","citation_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_lookup_idx" ON "evidence" USING btree ("session_id","account_id");
