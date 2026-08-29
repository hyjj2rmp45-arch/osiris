ALTER TABLE "token_metadata"
  ADD COLUMN "mint_authority" text,
  ADD COLUMN "freeze_authority" text,
  ADD COLUMN "transfer_hook_program_id" text,
  ADD COLUMN "is_authority_safe" boolean DEFAULT true NOT NULL,
  ADD COLUMN "safety_score" integer DEFAULT 100 NOT NULL;
