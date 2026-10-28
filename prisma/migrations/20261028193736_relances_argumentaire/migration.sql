-- AlterTable
ALTER TABLE "SequenceTemplate" ADD COLUMN     "liDelays" JSONB;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "angleDetail" TEXT NOT NULL DEFAULT '';

