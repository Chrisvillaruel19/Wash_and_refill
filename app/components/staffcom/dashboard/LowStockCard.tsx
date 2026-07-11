import { LowStockItem } from "../../../staff/(dashboard)/types";
    
interface LowStockCardProps {
  items: LowStockItem[];
}

export default function LowStockCard({ items }: LowStockCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Low Stock Items</h2>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
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