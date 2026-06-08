CREATE TABLE "api_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" varchar(32) NOT NULL,
	"chat_id" uuid,
	"request_id" varchar(64),
	"method" varchar(8) NOT NULL,
	"status_code" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"is_error" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
