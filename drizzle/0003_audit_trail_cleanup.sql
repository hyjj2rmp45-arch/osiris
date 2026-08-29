-- Migration 0003: Audit trail + DB cleanup
-- OSIRIS Phase 5

-- Rename the duplicate/old audit_logs table if it exists
-- The old audit_logs table (id, user_id, action, metadata, created_at) is kept for backward compat.
-- New audit_log table provides SHA-256 chained entries.

-- Add indexes to audit_log if not exists (idempotent)
CREATE INDEX IF NOT EXISTS audit_log_event_type_idx ON audit_log (event_type);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at);

-- Add composite index for trade intent lookups
CREATE INDEX IF NOT EXISTS trade_intents_user_wallet_idx ON trade_intents (user_id, wallet_id);
CREATE INDEX IF NOT EXISTS trade_intents_status_created_idx ON trade_intents (status, created_at);

-- Add indexes for positions lookups
CREATE INDEX IF NOT EXISTS positions_wallet_mint_idx ON positions (wallet_id, mint);

-- Add index for webhook events DLQ scanning
CREATE INDEX IF NOT EXISTS webhook_events_status_created_idx ON webhook_events (status, created_at);
