interface BestSellersCardProps {
  items: { name: string; quantitySold: number }[];
}

// Horizontal bars (one colour, value at the bar's tip in text ink) — reads
// better than a wide two-column table on a phone.
export default function BestSellersCard({ items }: BestSellersCardProps) {
  const max = Math.max(...items.map((i) => i.quantitySold), 0);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full">
      <h2 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Best-selling packages</h2>
      {items.length === 0 ? (
        <p className="text-gray-400 text-sm py-6 text-center">No package sales yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.name}>
              <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                <span className="text-gray-800 font-medium truncate">{item.name}</span>
                <span className="text-gray-900 font-semibold tabular-nums shrink-0">
                  {item.quantitySold} sold
                </span>
              </div>
              <div className="h-3 rounded-r bg-gray-100">
                <div
                  className="h-3 rounded-r bg-blue-600"
                  style={{ width: max > 0 ? `${Math.max((item.quantitySold / max) * 100, 2)}%` : 0 }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
