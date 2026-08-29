CREATE TYPE "public"."user_role" AS ENUM('user', 'support', 'admin');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circuit_breaker_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"rolling_loss" integer DEFAULT 0,
	"consecutive_losses" integer DEFAULT 0,
	"is_tripped" boolean DEFAULT false,
	"tripped_at" timestamp,
	"override_expires_at" timestamp,
	"last_trade_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copy_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_address" text NOT NULL,
	"label" text,
	"copy_percentage" integer NOT NULL,
	"max_position_size" integer NOT NULL,
	"min_trade_size" integer NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copy_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"copy_target_id" integer NOT NULL,
	"source_wallet" text NOT NULL,
	"target_wallet" text NOT NULL,
	"input_mint" text NOT NULL,
	"output_mint" text NOT NULL,
	"source_input_amount" integer NOT NULL,
	"source_output_amount" integer NOT NULL,
	"copy_input_amount" integer NOT NULL,
	"copy_output_amount" integer NOT NULL,
	"signature" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"latency_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	CONSTRAINT "copy_trades_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "kill_switch_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"trigger" text,
	"source" text NOT NULL,
	"details" jsonb,
	"status" text NOT NULL,
	"request_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kill_switch_events_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"signature" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "multisig_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"proposal_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"threshold" integer DEFAULT 2 NOT NULL,
	"total_signers" integer DEFAULT 3 NOT NULL,
	"signatures" jsonb DEFAULT '[]'::jsonb,
	"proposer_id" text NOT NULL,
	"executed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"input_mint" text NOT NULL,
	"output_mint" text NOT NULL,
	"input_amount" integer NOT NULL,
	"output_amount" integer NOT NULL,
	"simulated_price" integer NOT NULL,
	"pnl" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"mint" text NOT NULL,
	"amount" integer NOT NULL,
	"avg_entry_price" integer NOT NULL,
	"unrealized_pnl" integer DEFAULT 0,
	"realized_pnl" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"action" text NOT NULL,
	"count" integer DEFAULT 0,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"window_end" timestamp NOT NULL,
	"is_blocked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_id" integer NOT NULL,
	"code" text NOT NULL,
	"reward_paid" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tier" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"wallet_id" integer NOT NULL,
	"mint" text NOT NULL,
	"amount" integer NOT NULL,
	"original_amount" integer NOT NULL,
	"cost_basis" integer NOT NULL,
	"cost_basis_usd" integer DEFAULT 0,
	"acquisition_date" timestamp DEFAULT now() NOT NULL,
	"acquisition_price" integer NOT NULL,
	"acquisition_slot" integer,
	"is_closed" boolean DEFAULT false,
	"closed_at" timestamp,
	"realized_pnl" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "token_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"mint" text NOT NULL,
	"name" text,
	"symbol" text,
	"decimals" integer,
	"logo_uri" text,
	"price" integer,
	"price_usd" integer,
	"is_token_2022" boolean DEFAULT false,
	"risk_score" integer,
	"last_fetched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "token_metadata_mint_unique" UNIQUE("mint")
);
--> statement-breakpoint
CREATE TABLE "tracked_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"tags" jsonb,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracked_wallets_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallet_id" integer NOT NULL,
	"signature" text NOT NULL,
	"input_mint" text NOT NULL,
	"output_mint" text NOT NULL,
	"input_amount" integer NOT NULL,
	"output_amount" integer NOT NULL,
	"fee" integer NOT NULL,
	"slot" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trades_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" text NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"address" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"derivation_path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_error" text,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circuit_breaker_state" ADD CONSTRAINT "circuit_breaker_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_targets" ADD CONSTRAINT "copy_targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copy_trades" ADD CONSTRAINT "copy_trades_copy_target_id_copy_targets_id_fk" FOREIGN KEY ("copy_target_id") REFERENCES "public"."copy_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_trades" ADD CONSTRAINT "paper_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "circuit_breaker_user_idx" ON "circuit_breaker_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "circuit_breaker_tripped_idx" ON "circuit_breaker_state" USING btree ("is_tripped");--> statement-breakpoint
CREATE UNIQUE INDEX "copy_targets_user_address_unique" ON "copy_targets" USING btree ("user_id","target_address");--> statement-breakpoint
CREATE INDEX "copy_trades_target_idx" ON "copy_trades" USING btree ("copy_target_id");--> statement-breakpoint
CREATE INDEX "copy_trades_status_idx" ON "copy_trades" USING btree ("status");--> statement-breakpoint
CREATE INDEX "copy_trades_source_wallet_idx" ON "copy_trades" USING btree ("source_wallet");--> statement-breakpoint
CREATE INDEX "copy_trades_created_at_idx" ON "copy_trades" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kill_switch_events_type_idx" ON "kill_switch_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "kill_switch_events_trigger_idx" ON "kill_switch_events" USING btree ("trigger");--> statement-breakpoint
CREATE INDEX "kill_switch_events_created_at_idx" ON "kill_switch_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "multisig_proposals_status_idx" ON "multisig_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "multisig_proposals_type_idx" ON "multisig_proposals" USING btree ("proposal_type");--> statement-breakpoint
CREATE INDEX "multisig_proposals_expires_idx" ON "multisig_proposals" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_identifier_action_unique" ON "rate_limits" USING btree ("identifier","action");--> statement-breakpoint
CREATE INDEX "rate_limits_window_idx" ON "rate_limits" USING btree ("window_start","window_end");--> statement-breakpoint
CREATE INDEX "rate_limits_blocked_idx" ON "rate_limits" USING btree ("is_blocked");--> statement-breakpoint
CREATE INDEX "tax_lots_user_idx" ON "tax_lots" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tax_lots_wallet_idx" ON "tax_lots" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "tax_lots_mint_idx" ON "tax_lots" USING btree ("mint");--> statement-breakpoint
CREATE INDEX "tax_lots_open_idx" ON "tax_lots" USING btree ("is_closed");--> statement-breakpoint
CREATE UNIQUE INDEX "token_metadata_mint_unique" ON "token_metadata" USING btree ("mint");--> statement-breakpoint
CREATE INDEX "token_metadata_price_idx" ON "token_metadata" USING btree ("price");--> statement-breakpoint
CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "webhook_events_source_type_idx" ON "webhook_events" USING btree ("source","event_type");--> statement-breakpoint
CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");