import { CheckCircle2, PackageX, AlertTriangle } from "lucide-react";
import CardHeader from "../../admincom/dashboard/CardHeader";
import { LowStockItem } from "../../../staff/(dashboard)/types";

const PREVIEW_LIMIT = 5;

interface LowStockCardProps {
  items: LowStockItem[];
}

// How full an item is compared to its alert level (0–1). Without a known
// alert level, a low item just shows as low.
function level(item: LowStockItem) {
  if (item.quantityRemaining <= 0) return 0;
  if (!item.lowStockAlert || item.lowStockAlert <= 0) return 0.5;
  return Math.min(1, item.quantityRemaining / item.lowStockAlert);
}

// Supplies at or below their alert level — the most urgent first (out of
// stock, then the lowest compared to its alert level).
export default function LowStockCard({ items }: LowStockCardProps) {
  const sorted = [...items].sort((a, b) => level(a) - level(b));
  const visibleItems = sorted.slice(0, PREVIEW_LIMIT);
  const hiddenCount = items.length - visibleItems.length;
  const outOfStock = items.filter((i) => i.quantityRemaining <= 0).length;

  return (
    <div className="bg-white rounded-xl shadow-md ring-1 ring-gray-200/80 p-4 sm:p-6 h-full flex flex-col">
      <CardHeader
        title="Low stock items"
        linkHref={items.length > 0 ? "/staff/inventory?filter=lowStock" : undefined}
        linkLabel="View supplies"
      />

      {visibleItems.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200 px-3 py-1 text-xs font-semibold">
              <AlertTriangle size={13} />
              {items.length} need{items.length === 1 ? "s" : ""} restocking
            </span>
            {outOfStock > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-1 text-xs font-semibold">
                <PackageX size={13} />
                {outOfStock} out of stock
              </span>
            )}
          </div>

          <ul className="space-y-2">
            {visibleItems.map((item) => {
              const empty = item.quantityRemaining <= 0;
              const pct = Math.round(level(item) * 100);
              return (
                <li key={item.id} className="rounded-lg border border-gray-200 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-px text-[11px] font-semibold ring-1 ${
                        empty ? "bg-red-50 text-red-700 ring-red-200" : "bg-amber-50 text-amber-800 ring-amber-200"
                      }`}
                    >
                      {empty ? "Out of stock" : "Low"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${empty ? "bg-red-500" : pct <= 50 ? "bg-red-400" : "bg-amber-400"}`}
                      style={{ width: `${Math.max(pct, empty ? 0 : 4)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-600 tabular-nums">
                    <span className={`font-semibold ${empty ? "text-red-600" : "text-gray-900"}`}>
                      {item.quantityRemaining} {item.unit}
                    </span>{" "}
                    left
                    {item.lowStockAlert ? (
                      <span className="text-gray-500"> · alert at {item.lowStockAlert}</span>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 && <p className="text-xs text-gray-600 mt-3">+{hiddenCount} more in Supplies</p>}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <CheckCircle2 size={28} className="text-green-500 mb-2" />
          <p className="text-sm font-medium text-gray-700">All supplies are stocked.</p>
          <p className="text-xs text-gray-500">Items show here when they reach their alert level.</p>
        </div>
      )}
    </div>
  );
}
