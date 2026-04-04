CREATE TABLE "chats" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"title" varchar(100),
	"status" varchar(32),
	"last_message_at" text,
	"metadata" text,
	"summary" text,
	"summary_updated" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"users_id" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"auth_provider" varchar(100),
	"email" varchar(100),
	"password" varchar(255),
	"name" varchar(100),
	"role" varchar(16) DEFAULT 'user',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"sender_type" varchar(100),
	"content" text,
	"status" varchar(16),
	"token_count" integer,
	"model_name" varchar(100),
	"parent_message" varchar(100),
	"turn_index" varchar(100),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"chats_id" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_feedbacks" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"rating" integer,
	"reason" varchar(100),
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"messages_id" varchar(100) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_users_id_users_id_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_messages_id_fk" FOREIGN KEY ("parent_message") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chats_id_chats_id_fk" FOREIGN KEY ("chats_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_feedbacks" ADD CONSTRAINT "message_feedbacks_messages_id_messages_id_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;