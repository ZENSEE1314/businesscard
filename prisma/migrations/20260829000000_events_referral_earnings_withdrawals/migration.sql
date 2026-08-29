-- Events, event attendees, referral earnings (20% commission) and withdrawals.
-- Idempotent: safe to re-apply when a previous attempt left partial objects.

DO $$ BEGIN
  CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'MEMBERS_ONLY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM ('PUBLISHED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "description" VARCHAR(2000),
    "location" VARCHAR(160),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "EventStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventAttendee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralEarning" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "membershipId" TEXT,
    "tier" "MembershipTier" NOT NULL,
    "amountIdr" INTEGER NOT NULL,
    "rateBps" INTEGER NOT NULL DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountIdr" INTEGER NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "bankName" VARCHAR(80),
    "accountNumber" VARCHAR(40),
    "accountHolder" VARCHAR(80),
    "note" VARCHAR(300),
    "adminNote" VARCHAR(300),
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Event_status_startsAt_idx" ON "Event"("status", "startsAt");
CREATE INDEX IF NOT EXISTS "Event_hostId_idx" ON "Event"("hostId");
CREATE UNIQUE INDEX IF NOT EXISTS "EventAttendee_eventId_userId_key" ON "EventAttendee"("eventId", "userId");
CREATE INDEX IF NOT EXISTS "EventAttendee_userId_idx" ON "EventAttendee"("userId");
CREATE INDEX IF NOT EXISTS "ReferralEarning_referrerId_createdAt_idx" ON "ReferralEarning"("referrerId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralEarning_referredUserId_idx" ON "ReferralEarning"("referredUserId");
CREATE INDEX IF NOT EXISTS "Withdrawal_userId_createdAt_idx" ON "Withdrawal"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_createdAt_idx" ON "Withdrawal"("status", "createdAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_hostId_fkey') THEN
    ALTER TABLE "Event" ADD CONSTRAINT "Event_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventAttendee_eventId_fkey') THEN
    ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventAttendee_userId_fkey') THEN
    ALTER TABLE "EventAttendee" ADD CONSTRAINT "EventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralEarning_referrerId_fkey') THEN
    ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ReferralEarning_referredUserId_fkey') THEN
    ALTER TABLE "ReferralEarning" ADD CONSTRAINT "ReferralEarning_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Withdrawal_userId_fkey') THEN
    ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Withdrawal_processedById_fkey') THEN
    ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
