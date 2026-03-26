/*
  Warnings:

  - Added the required column `siteId` to the `Mission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "siteId" TEXT NOT NULL,
ADD COLUMN     "statut" "StatusAction" NOT NULL DEFAULT 'A_FAIRE',
ADD COLUMN     "type" TEXT DEFAULT 'Audit Périodique';

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
