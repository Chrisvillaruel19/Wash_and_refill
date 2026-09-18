-- CreateTable
CREATE TABLE "ShiftHandoverInventory" (
    "id" TEXT NOT NULL,
    "shiftHandoverId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "beginningQty" INTEGER NOT NULL,
    "endingQty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandoverInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftHandoverInventory_shiftHandoverId_idx" ON "ShiftHandoverInventory"("shiftHandoverId");

-- CreateIndex
CREATE INDEX "ShiftHandoverInventory_inventoryId_idx" ON "ShiftHandoverInventory"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftHandoverInventory_shiftHandoverId_inventoryId_key" ON "ShiftHandoverInventory"("shiftHandoverId", "inventoryId");

-- AddForeignKey
ALTER TABLE "ShiftHandoverInventory" ADD CONSTRAINT "ShiftHandoverInventory_shiftHandoverId_fkey" FOREIGN KEY ("shiftHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHandoverInventory" ADD CONSTRAINT "ShiftHandoverInventory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
