-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('WASH_AND_DRY', 'WASH_ONLY', 'DRY_ONLY');

-- AlterTable
ALTER TABLE "OrderDetail" ADD COLUMN     "serviceType" "ServiceType";
