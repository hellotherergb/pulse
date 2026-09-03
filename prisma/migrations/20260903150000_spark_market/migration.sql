-- AlterTable
ALTER TABLE "SparkOrder" ADD COLUMN "lemonOrderId" TEXT;
ALTER TABLE "SparkOrder" ADD COLUMN "refundedSparks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SparkOrder" ADD COLUMN "refundedAgorot" INTEGER NOT NULL DEFAULT 0;

-- Backfill Lemon order ids from checkoutId prefix
UPDATE "SparkOrder"
SET "lemonOrderId" = substring("checkoutId" from 10)
WHERE "lemonOrderId" IS NULL AND "checkoutId" LIKE 'ls_order_%';

-- CreateTable
CREATE TABLE "SparkCashout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sparks" INTEGER NOT NULL,
    "amountAgorot" INTEGER NOT NULL,
    "rateAgorot" INTEGER NOT NULL,
    "boostBps" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT 'SPARKS',
    "emoteId" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SparkCashout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparkCashoutItem" (
    "id" TEXT NOT NULL,
    "cashoutId" TEXT NOT NULL,
    "sparkOrderId" TEXT NOT NULL,
    "sparks" INTEGER NOT NULL,
    "amountAgorot" INTEGER NOT NULL,

    CONSTRAINT "SparkCashoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmoteListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT,
    "emoteId" TEXT NOT NULL,
    "ownedEmoteId" TEXT NOT NULL,
    "priceSparks" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "EmoteListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SparkCashout_userId_createdAt_idx" ON "SparkCashout"("userId", "createdAt");
CREATE INDEX "SparkCashout_status_createdAt_idx" ON "SparkCashout"("status", "createdAt");
CREATE INDEX "SparkCashoutItem_sparkOrderId_idx" ON "SparkCashoutItem"("sparkOrderId");
CREATE INDEX "EmoteListing_status_createdAt_idx" ON "EmoteListing"("status", "createdAt");
CREATE INDEX "EmoteListing_sellerId_idx" ON "EmoteListing"("sellerId");
CREATE INDEX "EmoteListing_emoteId_idx" ON "EmoteListing"("emoteId");

-- AddForeignKey
ALTER TABLE "SparkCashout" ADD CONSTRAINT "SparkCashout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SparkCashoutItem" ADD CONSTRAINT "SparkCashoutItem_cashoutId_fkey" FOREIGN KEY ("cashoutId") REFERENCES "SparkCashout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SparkCashoutItem" ADD CONSTRAINT "SparkCashoutItem_sparkOrderId_fkey" FOREIGN KEY ("sparkOrderId") REFERENCES "SparkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmoteListing" ADD CONSTRAINT "EmoteListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmoteListing" ADD CONSTRAINT "EmoteListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmoteListing" ADD CONSTRAINT "EmoteListing_emoteId_fkey" FOREIGN KEY ("emoteId") REFERENCES "CustomEmote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
