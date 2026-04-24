CREATE TABLE "mcp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"tool_name" text NOT NULL,
	"reviewer_profile" text,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"terminal_state" text,
	"transcript" jsonb,
	"cost_usd" text,
	"tokens_input" integer NOT NULL,
	"tokens_output" integer NOT NULL,
	"tool_calls" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"duration_ms" integer NOT NULL,
	"session_title" text,
	"context" text,
	"current_leaning" text,
	"stakes" text,
	"origin" text,
	"is_shared" boolean DEFAULT false NOT NULL,
	"share_token" text,
	CONSTRAINT "mcp_sessions_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE INDEX "mcp_sessions_user_id_idx" ON "mcp_sessions" USING btree ("user_id");