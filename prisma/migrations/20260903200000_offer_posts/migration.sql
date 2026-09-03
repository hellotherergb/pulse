ALTER TABLE "Post" ADD COLUMN "listingId" TEXT;

CREATE INDEX "Post_listingId_idx" ON "Post"("listingId");

ALTER TABLE "Post" ADD CONSTRAINT "Post_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "EmoteListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
