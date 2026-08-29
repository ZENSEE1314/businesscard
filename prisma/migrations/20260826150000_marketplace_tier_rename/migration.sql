-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "category" VARCHAR(60),
    "priceNote" VARCHAR(80),
    "imageUrl" TEXT,
    "whatsapp" VARCHAR(40),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceListing_active_createdAt_idx" ON "MarketplaceListing"("active", "createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_userId_idx" ON "MarketplaceListing"("userId");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Membership tier rename: BASIC→BRIDGEMAKER, GOLD→BRIDGEMAKER (folded),
-- DIAMOND→BRIDGEMASTER. Data-preserving: existing rows are remapped via CASE
-- and the enum type is swapped in place. Free users keep NULL (BridgeX Member).
-- PostgreSQL cannot drop enum values, so the type is recreated and swapped.
-- ---------------------------------------------------------------------------

-- Migrate any legacy pending/active GOLD orders onto the entry paid tier.
UPDATE "Membership" SET "tier" = 'BASIC' WHERE "tier" = 'GOLD';

CREATE TYPE "MembershipTier_new" AS ENUM ('BRIDGEMAKER', 'BRIDGEMASTER');

ALTER TABLE "User" ALTER COLUMN "membershipTier" TYPE "MembershipTier_new" USING (
  CASE "membershipTier"::text
    WHEN 'DIAMOND' THEN 'BRIDGEMASTER'::"MembershipTier_new"
    ELSE 'BRIDGEMAKER'::"MembershipTier_new"
  END
);

ALTER TABLE "Membership" ALTER COLUMN "tier" TYPE "MembershipTier_new" USING (
  CASE "tier"::text
    WHEN 'DIAMOND' THEN 'BRIDGEMASTER'::"MembershipTier_new"
    ELSE 'BRIDGEMAKER'::"MembershipTier_new"
  END
);

DROP TYPE "MembershipTier";

ALTER TYPE "MembershipTier_new" RENAME TO "MembershipTier";
