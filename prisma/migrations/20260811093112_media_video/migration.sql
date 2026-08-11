-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaSection" AS ENUM ('PRODUCT', 'INTRO');

-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "coverVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "coverVideoUrl" TEXT;

-- CreateTable
CREATE TABLE "BusinessMedia" (
    "id" TEXT NOT NULL,
    "businessProfileId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "section" "MediaSection" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessMedia_businessProfileId_section_idx" ON "BusinessMedia"("businessProfileId", "section");

-- AddForeignKey
ALTER TABLE "BusinessMedia" ADD CONSTRAINT "BusinessMedia_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "BusinessProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
