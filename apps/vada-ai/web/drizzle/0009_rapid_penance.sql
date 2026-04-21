CREATE TABLE "v2_baseline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" text NOT NULL,
	"variant" text NOT NULL,
	"run_index" integer NOT NULL,
	"question_text" text NOT NULL,
	"response_text" text NOT NULL,
	"parsed_json" jsonb,
	"schema_valid" boolean,
	"model_id" text NOT NULL,
	"provider" text NOT NULL,
	"tokens_input" integer,
	"tokens_output" integer,
	"elapsed_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "v2_baseline_runs_q_v_r_idx" ON "v2_baseline_runs" USING btree ("question_id","variant","run_index");