DROP TABLE "feedbacks" CASCADE;--> statement-breakpoint
ALTER TABLE "message_feedbacks" ADD COLUMN "feedback" varchar(10) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "message_feedbacks" DROP COLUMN "rating";--> statement-breakpoint
ALTER TABLE "message_feedbacks" DROP COLUMN "reason";--> statement-breakpoint
ALTER TABLE "message_feedbacks" DROP COLUMN "metadata";