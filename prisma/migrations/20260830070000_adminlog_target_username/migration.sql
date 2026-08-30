-- AdminLog.targetUsername was added to the schema but never migrated, so admin
-- log reads (findMany selecting all columns) crash with P2022. Add it safely.
ALTER TABLE "AdminLog" ADD COLUMN IF NOT EXISTS "targetUsername" TEXT;
