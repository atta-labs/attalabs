ALTER TYPE "public"."terminal_state" ADD VALUE 'SPARRING_COMPLETE';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "agent_models" jsonb;