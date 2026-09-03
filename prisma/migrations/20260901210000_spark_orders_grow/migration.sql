-- Rename Stripe session column to generic checkout id (Grow processId / Stripe session / demo).
ALTER TABLE "SparkOrder" RENAME COLUMN "stripeSessionId" TO "checkoutId";

ALTER TABLE "SparkOrder" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'grow';

UPDATE "SparkOrder"
SET "provider" = 'stripe'
WHERE "checkoutId" LIKE 'cs_%' OR "checkoutId" LIKE 'pending_%';

UPDATE "SparkOrder"
SET "provider" = 'demo'
WHERE "checkoutId" LIKE 'demo_%';

ALTER INDEX "SparkOrder_stripeSessionId_key" RENAME TO "SparkOrder_checkoutId_key";
