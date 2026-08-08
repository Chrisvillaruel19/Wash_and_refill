# Module 5 — Orders: Architecture Notes

Status: **frozen**. Do not modify except for a production bug, an absolutely-necessary schema migration, or an explicitly approved redesign.

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/orders` | Any authenticated user | Create an order (customer resolution, pricing, stock deduction — all atomic) |
| GET | `/api/orders` | Any authenticated user | List orders (lean — customer info only, no nested line items) |
| GET | `/api/orders/:id` | Any authenticated user | Get one order (full detail — line items, consumptions, customer) |
| PATCH | `/api/orders/:id/status` | Any authenticated user | Advance status one step forward |
| POST | `/api/orders/:id/cancel` | Any authenticated user | Cancel and restore inventory |

No generic update, no delete. Mutations are open to any authenticated user (not Admin-only) — the one deliberate deviation from every other module's RBAC pattern, verified against the real frontend where Staff, not Admin, owns the order lifecycle.

## Transaction Flow (Create)

One `prisma.$transaction`, in order:
1. `CustomerRepository.findOrCreateByPhone()` (atomic `upsert` — not create-then-catch, see Known Issues Fixed below).
2. For each line item (`PACKAGE` / `SERVICE` / `INVENTORY`): validate the reference exists and is active, compute its `subtotal` from the *current* price, and — for `PACKAGE`/`INVENTORY` lines only — accumulate inventory consumption into one `Map<inventoryId, totalNeeded>`.
3. For each aggregated inventory item: `InventoryRepository.decrementIfSufficient()` (atomic conditional `updateMany`, not read-then-write), abort with `InsufficientStockError` on a zero-row result, then `refreshStockStatus()`.
4. Derive `paymentStatus`/`paymentDate` from `amountPaid` vs. the computed `totalAmount` — never client-supplied.
5. Create `Order` (`status: PENDING`, decided by the service, not the repository), then `OrderDetail` rows, then one `InventoryConsumption` row per aggregated item.

Cancellation is a separate, smaller transaction: restore each consumed item via `incrementQuantity` + `refreshStockStatus`, then flip `status` to `CANCELLED`. Nothing else on the order is touched — payment fields are untouched, `InventoryConsumption` rows are left in place as history.

## Repository Responsibilities (`order.repository.ts`)

Pure data access only: `findAll`/`findById` (fixed `include` shapes), `create`, `createOrderDetails`, `createConsumptions`, `findConsumptionsByOrderId`, `updateStatus`. Every method accepts an optional transaction client. No business rules — `status: PENDING` used to be hardcoded here and was moved to the service layer during the Module 5 closing review.

Two small, justified additions to *other* modules' repositories, made specifically for Orders to reuse safely:
- `InventoryRepository.decrementIfSufficient()` — atomic conditional decrement.
- `CustomerRepository.findOrCreateByPhone()` — atomic upsert, safe to call mid-transaction (unlike the create-then-catch pattern Customer's own standalone endpoint uses).

## Service Responsibilities

- `create-order.service.ts` — the core orchestration described above.
- `list-orders.service.ts` / `get-order.service.ts` — thin reads.
- `update-order-status.service.ts` — enforces `order-status-flow.util.ts`'s transition map.
- `cancel-order.service.ts` — enforces the cancellable-states guard, restores stock.
- `order-status-flow.util.ts` — the single source of truth for legal transitions (`PENDING→IN_PROGRESS→READY→CLAIMED`, strictly forward, no skipping; `CANCELLED` reachable only from `PENDING`/`IN_PROGRESS`/`READY`).
- `order-errors.ts` — `OrderValidationError` (→400) / `InsufficientStockError` (→409), so the transaction can throw typed, meaningful errors instead of generic failures.

## Business Rules Encoded

- Package, Service, and Inventory are independent line-item types — a Package never implies or requires a Service line (verified against the real frontend checkout before implementation).
- Every price is frozen into `OrderDetail.subtotal` at creation; nothing ever recomputes it from the live catalog later.
- Inventory consumption is aggregated across all lines *before* any stock write — one decrement per unique item, not per line.
- `paymentStatus`, `paymentDate`, `totalAmount`, `status` are always server-computed.
- Status only ever moves forward one step at a time; cancellation is a separate, guarded action; a `CLAIMED` order is permanently terminal.

## Known Intentional Limitations

- `OrderDetail` stores `subtotal`, not a separate per-unit price-at-sale — the total is frozen and provably correct, but the unit price must be back-derived if ever needed.
- `InventoryConsumption` links to `Order`, not to a specific `OrderDetail` row — if a Package line and a direct Inventory line both consume the same item, they merge into one consumption row with no way to attribute the aggregated total back to either individual line.
- No partial-payment tracking beyond the single `amountPaid` captured at creation.
- No pagination/filtering on `GET /orders` yet — fine at current scale.

## Known Issues Found and Fixed During This Module

- **Postgres transaction-abort bug:** catching a `P2002` unique-constraint error mid-transaction and continuing to query the same transaction client doesn't work — Postgres aborts the whole transaction after any error. Fixed by adding `findOrCreateByPhone()` (atomic `upsert`) instead of reusing Customer's create-then-catch pattern.
- **Duplicated stock-status logic:** the same three-step "re-fetch → compute → persist" sequence existed in both create and cancel flows. Extracted into `refreshStockStatus()`.
- **A business rule leaking into the repository layer:** `status: PENDING` was hardcoded inside `OrderRepository.create()`. Moved to the service, which now passes it explicitly.

## Future Integration Points

- **Dashboard Statistics (Module 8):** will read `Order`/`OrderDetail`/`InventoryConsumption` for aggregation only (revenue, best-sellers by `packageId`/`serviceId`). Every field needed already exists; purely additive, no change to Orders required.
- **Shift Handover (Module 7):** will read Orders filtered by `userId` + `createdAt` for shift-scoping, mirroring the frontend's existing logic. Read-only, no change to Orders required.
- **Audit Logs (Module 10):** the one *expected* future touch — `create-order`, `update-order-status`, and `cancel-order` will each need one additional call to write an `AuditLog` entry inside their existing transactions. Additive, not a redesign.
