import Link from "next/link";
import { LowStockItem } from "../../../staff/(dashboard)/types";

const PREVIEW_LIMIT = 5;

interface LowStockCardProps {
  items: LowStockItem[];
}

export default function LowStockCard({ items }: LowStockCardProps) {
  const visibleItems = items.slice(0, PREVIEW_LIMIT);
  const hasMore = items.length > PREVIEW_LIMIT;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Low Stock Items</h2>
        {hasMore && (
          <Link
            href="/staff/inventory?filter=lowStock"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View all in Inventory →
          </Link>
        )}
      </div>

      {visibleItems.length > 0 ? (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
            >
              <span className="text-gray-700">{item.name}</span>
              <span className="text-gray-800 font-medium">
                {item.quantityRemaining}x remaining
              </span>
              <span className="text-gray-500 text-sm">{item.unit}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">No low stock items.</p>
      )}
    </div>
  );
}
