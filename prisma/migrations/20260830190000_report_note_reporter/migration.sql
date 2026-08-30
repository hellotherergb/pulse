-- AlterTable
ALTER TABLE "BanRequest" ADD COLUMN IF NOT EXISTS "reporterId" TEXT;
ALTER TABLE "BanRequest" ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "BanRequest_reporterId_idx" ON "BanRequest"("reporterId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "BanRequest" ADD CONSTRAINT "BanRequest_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
