-- CreateEnum
CREATE TYPE "SignupSource" AS ENUM ('DIRECT', 'REFERRAL_LINK', 'CARD_LINK', 'QR_SCAN', 'NFC_CARD', 'EVENT_INVITE');

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('MANUAL', 'QR_SCAN', 'SHARED_LINK', 'NFC_CARD', 'EVENT', 'REFERRAL', 'CARD_SIGNUP');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginDay" TEXT,
ADD COLUMN     "loginStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signupCardHandle" TEXT,
ADD COLUMN     "signupEventId" TEXT,
ADD COLUMN     "signupSource" "SignupSource",
ADD COLUMN     "totalLoginDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "whatICanOffer" TEXT,
ADD COLUMN     "whoIAm" TEXT,
ADD COLUMN     "whoIWantToFind" TEXT;

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "streakDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "contactUserId" TEXT NOT NULL,
    "source" "ContactSource" NOT NULL DEFAULT 'MANUAL',
    "sourceCardId" TEXT,
    "eventId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyCheckIn_localDate_idx" ON "DailyCheckIn"("localDate");

-- CreateIndex
CREATE INDEX "DailyCheckIn_userId_createdAt_idx" ON "DailyCheckIn"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckIn_userId_localDate_key" ON "DailyCheckIn"("userId", "localDate");

-- CreateIndex
CREATE INDEX "Contact_contactUserId_idx" ON "Contact"("contactUserId");

-- CreateIndex
CREATE INDEX "Contact_ownerUserId_createdAt_idx" ON "Contact"("ownerUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_ownerUserId_contactUserId_key" ON "Contact"("ownerUserId", "contactUserId");

-- AddForeignKey
ALTER TABLE "DailyCheckIn" ADD CONSTRAINT "DailyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

