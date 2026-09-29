import Link from "next/link";
import CardHeader from "./CardHeader";

interface OrderPipelineCardProps {
  pending: number;
  inProgress: number;
  ready: number;
  claimedToday: number;
}

// Same status colours as the Services/Laundry pages. Each stage is also
// named and counted in the legend below, so colour is never the only cue.
const STAGES = [
  { key: "pending", label: "Pending", bar: "bg-orange-500", dot: "bg-orange-500" },
  { key: "inProgress", label: "In progress", bar: "bg-blue-600", dot: "bg-blue-600" },
  { key: "ready", label: "Ready", bar: "bg-green-600", dot: "bg-green-600" },
] as const;

export default function OrderPipelineCard({ pending, inProgress, ready, claimedToday }: OrderPipelineCardProps) {
  const counts = { pending, inProgress, ready };
  const active = pending + inProgress + ready;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full">
      <CardHeader title="Order pipeline" linkHref="/admin/claim_monitoring" linkLabel="View orders" />
      <p className="text-sm text-gray-500 mb-4">
        <span className="font-semibold text-gray-900">{active}</span> active order{active === 1 ? "" : "s"}
      </p>

      {/* Segments separated by a 2px gap; an empty grey track when nothing is active. */}
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-gray-100 mb-4">
        {active > 0 &&
          STAGES.map((s) =>
            counts[s.key] > 0 ? (
              <div
                key={s.key}
                className={s.bar}
                style={{ width: `${(counts[s.key] / active) * 100}%` }}
                title={`${s.label}: ${counts[s.key]}`}
              />
            ) : null
          )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {STAGES.map((s) => (
          <Link
            key={s.key}
            href="/admin/claim_monitoring"
            className="rounded-lg border border-gray-100 p-2 sm:p-3 hover:bg-gray-50 min-h-[44px]"
          >
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
              {s.label}
            </span>
            <span className="block text-xl font-bold text-gray-900 mt-0.5 tabular-nums">{counts[s.key]}</span>
          </Link>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 pt-3 border-t border-gray-100">
        Claimed today: <span className="font-semibold text-gray-900">{claimedToday}</span>
      </p>
    </div>
  );
}
