import { CheckCircle2 } from "lucide-react";
import CardHeader from "../../admincom/dashboard/CardHeader";
import { LowStockItem } from "../../../staff/(dashboard)/types";

const PREVIEW_LIMIT = 5;

interface LowStockCardProps {
  items: LowStockItem[];
}

export default function LowStockCard({ items }: LowStockCardProps) {
  const visibleItems = items.slice(0, PREVIEW_LIMIT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full">
      <CardHeader
        title="Low stock items"
        linkHref={items.length > 0 ? "/staff/inventory?filter=lowStock" : undefined}
        linkLabel="View inventory"
      />

      {visibleItems.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            <span className="font-semibold text-red-600">{items.length}</span> item
            {items.length === 1 ? "" : "s"} need{items.length === 1 ? "s" : ""} restocking
          </p>
          <ul className="divide-y divide-gray-100">
            {visibleItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex items-center gap-2 min-w-0 text-sm text-gray-800">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  <span className="font-semibold text-red-600">{item.quantityRemaining}</span>
                  <span className="text-gray-500"> {item.unit} left</span>
                </span>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && <p className="text-xs text-gray-400 mt-3">+{hiddenCount} more in Inventory</p>}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-8 text-gray-400">
          <CheckCircle2 size={28} className="text-green-500 mb-2" />
          <p className="text-sm">All supplies are stocked.</p>
        </div>
      )}
    </div>
  );
}
