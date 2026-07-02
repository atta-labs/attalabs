ALTER TABLE "benchmark_runs" ALTER COLUMN "judge_model" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "benchmark_runs" ALTER COLUMN "judge_verdict" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "benchmark_runs" ALTER COLUMN "judge_score" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "benchmark_runs" ALTER COLUMN "judge_reasoning" DROP NOT NULL;
