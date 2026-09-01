-- CreateTable
CREATE TABLE "SparkOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "sparks" INTEGER NOT NULL,
    "amountAgorot" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ils',
    "stripeSessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "SparkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SparkOrder_stripeSessionId_key" ON "SparkOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "SparkOrder_userId_createdAt_idx" ON "SparkOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SparkOrder_status_createdAt_idx" ON "SparkOrder"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SparkOrder" ADD CONSTRAINT "SparkOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
