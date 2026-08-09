-- AlterTable
ALTER TABLE "CustomEmote" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CustomEmote" ALTER COLUMN "glyph" SET DEFAULT '✨';
