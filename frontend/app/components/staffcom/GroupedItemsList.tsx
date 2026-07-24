"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { groupItems } from "../../lib/groupItems";

interface GroupedItemsListProps {
  items: string[];
  previewCount?: number;
  className?: string;
  itemClassName?: string;
}

export default function GroupedItemsList({
  items,
  previewCount = 2,
  className = "",
  itemClassName = "",
}: GroupedItemsListProps) {
  const [expanded, setExpanded] = useState(false);
  const grouped = groupItems(items);

  if (grouped.length === 0) {
    return <p className={`text-sm text-gray-400 ${className}`}>No items listed</p>;
  }

  const hasMore = grouped.length > previewCount;
  const visible = expanded ? grouped : grouped.slice(0, previewCount);
  const remaining = grouped.length - previewCount;

  return (
    <div className={className}>
      {visible.map((g) => (
        <p key={g.name} className={`truncate ${itemClassName}`} title={g.name}>
          {g.qty > 1 ? `${g.name} ×${g.qty}` : g.name}
        </p>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium mt-1"
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              + {remaining} more <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
