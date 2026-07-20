/*
  Warnings:

  - The values [AVAILABLE] on the enum `StockStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `dateUsed` on the `InventoryConsumption` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remaining_cash` to the `Withdrawal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockStatus_new" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK');
ALTER TABLE "public"."Inventory" ALTER COLUMN "stockStatus" DROP DEFAULT;
ALTER TABLE "Inventory" ALTER COLUMN "stockStatus" TYPE "StockStatus_new" USING ("stockStatus"::text::"StockStatus_new");
ALTER TYPE "StockStatus" RENAME TO "StockStatus_old";
ALTER TYPE "StockStatus_new" RENAME TO "StockStatus";
DROP TYPE "public"."StockStatus_old";
ALTER TABLE "Inventory" ALTER COLUMN "stockStatus" SET DEFAULT 'IN_STOCK';
COMMIT;

-- AlterTable
ALTER TABLE "Attendance" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "phoneNumber" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Inventory" ALTER COLUMN "stockStatus" SET DEFAULT 'IN_STOCK';

-- AlterTable
ALTER TABLE "InventoryConsumption" DROP COLUMN "dateUsed",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "remaining_cash" DECIMAL(65,30) NOT NULL,
ALTER COLUMN "withdrawalDate" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");
