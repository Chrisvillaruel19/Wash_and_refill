export interface GroupedItem {
  name: string;
  qty: number;
}

// Handles both plain item strings ("Double") and already-suffixed ones
// ("Double ×5"), and merges duplicates either way — so it works whether
// the underlying data was saved before or after the cart-merge fix.
export function groupItems(items: string[]): GroupedItem[] {
  const counts = new Map<string, number>();

  for (const raw of items) {
    const match = raw.match(/^(.*) ×(\d+)$/);
    const name = match ? match[1] : raw;
    const qty = match ? parseInt(match[2], 10) : 1;
    counts.set(name, (counts.get(name) || 0) + qty);
  }

  return Array.from(counts.entries()).map(([name, qty]) => ({ name, qty }));
}

export function formatGroupedItems(items: string[]): string {
  return groupItems(items)
    .map((g) => (g.qty > 1 ? `${g.name} ×${g.qty}` : g.name))
    .join(", ");
}
