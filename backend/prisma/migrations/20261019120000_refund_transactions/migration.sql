-- Refunds become their own transactions (see the Refund model). An order's
-- payment is no longer edited when it's refunded, so past sales and frozen
-- Shift Handovers keep matching what was recorded at the time.

-- AlterTable
ALTER TABLE "ShiftHandover" ADD COLUMN     "cashRefunds" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "gcashRefunds" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "drawerStart" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reason" TEXT NOT NULL,
    "shiftHandoverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_shiftHandoverId_idx" ON "Refund"("shiftHandoverId");

-- CreateIndex
CREATE INDEX "Refund_createdAt_idx" ON "Refund"("createdAt");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_shiftHandoverId_fkey" FOREIGN KEY ("shiftHandoverId") REFERENCES "ShiftHandover"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every order already marked REFUNDED becomes a full refund
-- record (same amount and method it was paid with; the old flow recorded no
-- reason or admin, so the earliest Admin stands in and the reason says so),
-- and the order goes back to PAID. Unclaimed like any new refund, so the
-- next Shift Handover reconciles the payment and its refund together.
INSERT INTO "Refund" ("id", "orderId", "userId", "amount", "method", "reason", "createdAt")
SELECT
    gen_random_uuid()::text,
    o."id",
    (SELECT u."id" FROM "User" u WHERE u."role" = 'ADMIN' ORDER BY u."createdAt" LIMIT 1),
    o."totalAmount",
    COALESCE(o."paymentMethod", 'CASH'),
    'Refunded before refund details were recorded',
    o."updatedAt"
FROM "Order" o
WHERE o."paymentStatus" = 'REFUNDED';

UPDATE "Order" SET "paymentStatus" = 'PAID' WHERE "paymentStatus" = 'REFUNDED';

-- AlterEnum (REFUNDED is no longer used — refund state comes from Refund rows)
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('UNPAID', 'PAID');
ALTER TABLE "public"."Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus_new" USING ("paymentStatus"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
COMMIT;
