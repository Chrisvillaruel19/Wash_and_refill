const AVATAR_COLORS = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

// Initials + a stable color per customer, so a list is easy to scan.
// Shared by Customers and Laundry Monitoring.
export default function CustomerAvatar({ name, seed }: { name: string; seed: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length === 0 ? "?" : (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  const color = AVATAR_COLORS[[...seed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0) % AVATAR_COLORS.length];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold shrink-0 ${color}`}
    >
      {initials}
    </span>
  );
}
