CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"rating" integer,
	"message" text,
	"category" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "chats" RENAME COLUMN "users_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "messages" RENAME COLUMN "chats_id" TO "chat_id";--> statement-breakpoint
ALTER TABLE "message_feedbacks" RENAME COLUMN "messages_id" TO "message_id";--> statement-breakpoint
ALTER TABLE "chats" DROP CONSTRAINT "chats_users_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_chats_id_chats_id_fk";
--> statement-breakpoint
ALTER TABLE "message_feedbacks" DROP CONSTRAINT "message_feedbacks_messages_id_messages_id_fk";
--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "summary" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "chats" ALTER COLUMN "summary" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "auth_provider" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedbacks" ADD CONSTRAINT "message_feedbacks_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;