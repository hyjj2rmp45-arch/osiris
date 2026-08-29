CREATE TABLE "notification_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text NOT NULL,
	"source" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"request_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notification_events_source_idx" ON "notification_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "notification_events_severity_idx" ON "notification_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "notification_events_channel_idx" ON "notification_events" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notification_events_created_at_idx" ON "notification_events" USING btree ("created_at");