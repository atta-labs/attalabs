CREATE TABLE "v2_judge_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"comparison_type" text NOT NULL,
	"system_a_description" text NOT NULL,
	"system_b_description" text NOT NULL,
	"question" text NOT NULL,
	"response_a" text NOT NULL,
	"response_b" text NOT NULL,
	"judge_response" text NOT NULL,
	"diagnosis" text,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"tokens_input" integer,
	"tokens_output" integer,
	"elapsed_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "v2_judge_results_comparison_type_idx" ON "v2_judge_results" ("comparison_type");--> statement-breakpoint
CREATE INDEX "v2_judge_results_created_at_idx" ON "v2_judge_results" ("created_at" DESC);
