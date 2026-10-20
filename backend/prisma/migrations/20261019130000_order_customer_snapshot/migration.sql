-- Each order keeps the customer name and phone number typed for it (see
-- Order.customerName). Existing orders get their customer's current values,
-- so nothing they show changes.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerPhone" TEXT;

UPDATE "Order" o
SET "customerName" = c."customerName",
    "customerPhone" = c."phoneNumber"
FROM "Customer" c
WHERE c."id" = o."customerId";

ALTER TABLE "Order" ALTER COLUMN "customerName" SET NOT NULL;
