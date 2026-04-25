CREATE TABLE "benchmark_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"session_type" text NOT NULL,
	"session_id" uuid NOT NULL,
	"question_hash" text NOT NULL,
	"judge_model" text NOT NULL,
	"judge_verdict" text NOT NULL,
	"judge_score" integer NOT NULL,
	"judge_reasoning" text NOT NULL,
	"reviewer_scores" jsonb,
	"baseline_label" text,
	"baseline_response" text,
	"run_label" text,
	"tags" text[]
);
--> statement-breakpoint
CREATE INDEX "benchmark_runs_question_hash_idx" ON "benchmark_runs" USING btree ("question_hash");--> statement-breakpoint
CREATE INDEX "benchmark_runs_session_type_session_id_idx" ON "benchmark_runs" USING btree ("session_type","session_id");