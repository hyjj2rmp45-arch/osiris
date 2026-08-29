CREATE TABLE IF NOT EXISTS "kill_switch_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "trigger" text,
  "source" text NOT NULL,
  "details" jsonb,
  "status" text DEFAULT 'success' NOT NULL,
  "request_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "kill_switch_events_type_idx" ON "kill_switch_events" USING btree ("event_type");
CREATE INDEX IF NOT EXISTS "kill_switch_events_trigger_idx" ON "kill_switch_events" USING btree ("trigger");
CREATE INDEX IF NOT EXISTS "kill_switch_events_created_at_idx" ON "kill_switch_events" USING btree ("created_at");
