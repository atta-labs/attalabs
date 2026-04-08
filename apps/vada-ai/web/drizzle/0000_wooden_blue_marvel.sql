CREATE TYPE "public"."intervention_type" AS ENUM('WHISPER', 'DIRECTIVE', 'STOP');--> statement-breakpoint
CREATE TYPE "public"."session_state" AS ENUM('PENDING', 'ROUND_1', 'ROUND_2', 'ROUND_3', 'CONCLUDING', 'AUDITING', 'REVISING', 'TERMINAL');--> statement-breakpoint
CREATE TYPE "public"."terminal_state" AS ENUM('CLEAN', 'REVISED', 'UNCONVERGED');--> statement-breakpoint
CREATE TABLE "conclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"original_json" jsonb NOT NULL,
	"critic_verdict" varchar NOT NULL,
	"revised_json" jsonb,
	"critic_re_verdict" varchar,
	"terminal_state" "terminal_state" NOT NULL,
	"review_by" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conclusions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "intervention_type" NOT NULL,
	"target" varchar,
	"content" text,
	"round" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"question" text NOT NULL,
	"agents" text[] NOT NULL,
	"state" "session_state" DEFAULT 'PENDING' NOT NULL,
	"terminal_state" "terminal_state",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcript_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"agent" varchar NOT NULL,
	"content" text NOT NULL,
	"target" varchar,
	"order_in_round" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "conclusions" ADD CONSTRAINT "conclusions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_entries" ADD CONSTRAINT "transcript_entries_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;