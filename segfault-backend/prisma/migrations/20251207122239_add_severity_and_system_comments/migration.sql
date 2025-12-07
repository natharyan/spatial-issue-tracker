-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "severity" INTEGER;
