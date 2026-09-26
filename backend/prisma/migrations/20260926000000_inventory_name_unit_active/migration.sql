-- CreateIndex
-- Partial unique index: only one ACTIVE inventory item may exist per
-- (itemName, lower(unit)). This is the concurrency backstop behind the
-- app-level duplicate guard (findActiveByNameAndUnit) — "Liquid Detergent"
-- in Sachets and in Bottles are legitimately different products, but two
-- active rows of the same name AND unit are always a mistake. lower(unit)
-- makes "Bottle" and "bottle" the same unit, matching the app-level check's
-- case-insensitive unit comparison (mode: "insensitive").
--
-- WHERE isActive: a soft-deleted item must never block a genuinely new item
-- from reusing its name+unit — same reasoning that made isActive a soft-
-- delete flag in the first place (historical OrderDetail/PackageDetail/
-- InventoryConsumption rows keep referencing the old row; the catalog slot
-- itself is freed). Partial indexes keep the WHERE clause in the index
-- itself, so Postgres can enforce uniqueness and use it for lookups without
-- ever considering inactive rows.
--
-- CREATE INDEX IF NOT EXISTS (not plain CREATE INDEX): this migration is
-- safe to converge on databases where the index was already added manually
-- (e.g. a hotfix applied directly to production before this file shipped) —
-- rerunning deploy never fails on the pre-existing index.
CREATE UNIQUE INDEX IF NOT EXISTS "Inventory_itemName_unit_active_key"
ON "Inventory"("itemName", lower("unit"))
WHERE "isActive" = true;
