-- Refunds were logged as PAYMENT before REFUND existed; move them so the
-- Logs page's Refund tab shows them too.
UPDATE "AuditLog" SET "action" = 'REFUND'
WHERE "action" = 'PAYMENT' AND "module" = 'Order' AND "description" LIKE 'Refunded %';
