-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "shiftHandoverId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shiftHandoverId" TEXT;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "shiftHandoverId" TEXT;

-- CreateTable
CREATE TABLE "DrawerState" (
    "id" INTEGER NOT NULL,

    CONSTRAINT "DrawerState_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shiftHandoverId_fkey" FOREIGN KEY ("shiftHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_shiftHandoverId_fkey" FOREIGN KEY ("shiftHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_shiftHandoverId_fkey" FOREIGN KEY ("shiftHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the single DrawerState row. Application code never inserts into
-- this table — it only ever locks and reads row id = 1.
INSERT INTO "DrawerState" ("id") VALUES (1);

