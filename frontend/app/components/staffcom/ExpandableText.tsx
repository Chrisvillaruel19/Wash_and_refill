"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandableTextProps {
  text: string;
  label?: string;
  clampLines?: 2 | 3;
  className?: string;
}

export default function ExpandableText({
  text,
  label,
  clampLines = 2,
  className = "",
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const clampClass = clampLines === 3 ? "line-clamp-3" : "line-clamp-2";
  const needsToggle = text.length > 100;

  return (
    <div className={className}>
      <p className={expanded ? "" : clampClass}>
        {label && <span className="font-semibold text-gray-900">{label} </span>}
        {text}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium mt-0.5"
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Show more <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
