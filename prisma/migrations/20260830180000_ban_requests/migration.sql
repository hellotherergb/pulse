-- CreateTable
CREATE TABLE "BanRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "snippet" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BanRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BanRequest_status_createdAt_idx" ON "BanRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BanRequest_userId_idx" ON "BanRequest"("userId");

-- AddForeignKey
ALTER TABLE "BanRequest" ADD CONSTRAINT "BanRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
