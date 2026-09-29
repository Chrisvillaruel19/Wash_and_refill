-- CreateEnum
CREATE TYPE "WithdrawalSource" AS ENUM ('CASH', 'GCASH');

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "earningsFromHandoverId" TEXT,
ADD COLUMN     "source" "WithdrawalSource" NOT NULL DEFAULT 'CASH';

-- CreateIndex
CREATE INDEX "Withdrawal_earningsFromHandoverId_idx" ON "Withdrawal"("earningsFromHandoverId");

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_earningsFromHandoverId_fkey" FOREIGN KEY ("earningsFromHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;
