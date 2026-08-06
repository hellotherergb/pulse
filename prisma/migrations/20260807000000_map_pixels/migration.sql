-- CreateTable
CREATE TABLE "MapPixel" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "message" VARCHAR(140) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPixel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MapPixel_index_key" ON "MapPixel"("index");

-- CreateIndex
CREATE INDEX "MapPixel_ownerId_idx" ON "MapPixel"("ownerId");

-- AddForeignKey
ALTER TABLE "MapPixel" ADD CONSTRAINT "MapPixel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
