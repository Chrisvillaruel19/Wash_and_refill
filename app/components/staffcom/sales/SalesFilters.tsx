import { Search } from "lucide-react";

export type SalesFilter = "All" | "Claimed" | "Unclaimed";

interface SalesFiltersProps {
  activeFilter: SalesFilter;
  onFilterChange: (filter: SalesFilter) => void;
  searchDate: string;
  onSearchDateChange: (value: string) => void;
}

const filters: SalesFilter[] = ["All", "Claimed", "Unclaimed"];

export default function SalesFilters({
  activeFilter,
  onFilterChange,
  searchDate,
  onSearchDateChange,
}: SalesFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
      <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeFilter === f
                ? "bg-blue-600 text-white border-blue-600"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="relative w-full sm:flex-1 sm:max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search Date"
          value={searchDate}
          onChange={(e) => onSearchDateChange(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}