CREATE TABLE "v2_orchestration_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" text NOT NULL,
	"run_index" integer NOT NULL,
	"question_text" text NOT NULL,
	"session_id" uuid,
	"conclusion_text" text,
	"conclusion_json" jsonb,
	"terminal_state" text,
	"model_id" text NOT NULL,
	"provider" text NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "v2_orchestration_runs_q_r_idx" ON "v2_orchestration_runs" USING btree ("question_id","run_index");