// Shared formatting for the Admin dashboard cards.

export function peso(n: number, decimals = 2) {
  const abs = Math.abs(n).toLocaleString("en-PH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${n < 0 ? "-" : ""}₱${abs}`;
}

// Compact axis/label form: ₱950, ₱9.3k, ₱1.2M.
export function pesoShort(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return `₱${Math.round(n)}`;
}

export function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
