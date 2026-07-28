export type SalesFilter = "All" | "Claimed" | "Unclaimed";
export type DatePreset = "today" | "week" | "month" | "all";

interface SalesFiltersProps {
  activeFilter: SalesFilter;
  onFilterChange: (filter: SalesFilter) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPresetSelect: (preset: DatePreset) => void;
}

const filters: SalesFilter[] = ["All", "Claimed", "Unclaimed"];

const presets: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 Days" },
  { key: "month", label: "Last 30 Days" },
  { key: "all", label: "All" },
];

export default function SalesFilters({
  activeFilter,
  onFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onPresetSelect,
}: SalesFiltersProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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

        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => onPresetSelect(p.key)}
              className="shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium border text-gray-600 border-gray-300 hover:bg-gray-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900"
          />
        </div>
      </div>
    </div>
  );
}
