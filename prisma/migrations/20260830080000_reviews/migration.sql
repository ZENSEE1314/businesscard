-- "Who I have helped" reviews: one star rating + comment per author per subject.
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_authorId_subjectId_key" ON "Review"("authorId", "subjectId");
CREATE INDEX IF NOT EXISTS "Review_subjectId_createdAt_idx" ON "Review"("subjectId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_authorId_fkey') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Review_subjectId_fkey') THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectId_fkey"
      FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
