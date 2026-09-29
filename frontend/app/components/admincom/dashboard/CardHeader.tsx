import Link from "next/link";

interface CardHeaderProps {
  title: string;
  linkHref?: string;
  linkLabel?: string;
}

// Card title + optional "View …" link. The link's tap area is at least 40px
// tall (padding, pulled back with negative margin so it still lines up
// visually) — small text links are hard to hit on a phone.
export default function CardHeader({ title, linkHref, linkLabel }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2 mb-2 -mt-2">
      <h2 className="text-base sm:text-lg font-bold text-gray-800">{title}</h2>
      {linkHref && linkLabel && (
        <Link
          href={linkHref}
          className="inline-flex items-center min-h-[40px] px-2 -mr-2 text-xs sm:text-sm font-medium text-blue-600 hover:underline shrink-0 rounded-lg"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
