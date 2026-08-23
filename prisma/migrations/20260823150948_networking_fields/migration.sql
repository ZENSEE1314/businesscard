-- AlterTable
ALTER TABLE "BusinessProfile" ADD COLUMN     "canHelp" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "lookingFor" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "canHelp" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "lookingFor" TEXT[] DEFAULT ARRAY[]::TEXT[];
