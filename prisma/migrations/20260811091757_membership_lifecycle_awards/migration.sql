-- DropIndex
DROP INDEX "BusinessAward_awardId_businessProfileId_key";

-- AlterTable
ALTER TABLE "BusinessAward" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "businessProfileId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BusinessAward_userId_idx" ON "BusinessAward"("userId");

-- AddForeignKey
ALTER TABLE "BusinessAward" ADD CONSTRAINT "BusinessAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
