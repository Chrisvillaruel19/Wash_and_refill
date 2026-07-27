/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Token` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Token" DROP COLUMN "createdAt",
ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "revokedAt" TIMESTAMP(3);
