-- Owner-defined category/label for a saved contact. Idempotent guard keeps it
-- safe against prod databases that may already carry the column.
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "category" VARCHAR(60);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "followedUpAt" TIMESTAMP(3);
