CREATE TABLE "benchmark_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"baseline_answer" text,
	"baseline_provider" varchar,
	"baseline_model_id" varchar,
	"baseline_tokens_input" integer,
	"baseline_tokens_output" integer,
	"baseline_elapsed_ms" integer,
	"baseline_created_at" timestamp,
	"judge_response" text,
	"judge_tokens_input" integer,
	"judge_tokens_output" integer,
	"judge_elapsed_ms" integer,
	"judge_created_at" timestamp,
	"deliberation_tokens_input" integer DEFAULT 0 NOT NULL,
	"deliberation_tokens_output" integer DEFAULT 0 NOT NULL,
	"deliberation_sum_elapsed_ms" integer DEFAULT 0 NOT NULL,
	"deliberation_call_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "benchmark_metrics_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
ALTER TABLE "benchmark_metrics" ADD CONSTRAINT "benchmark_metrics_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;