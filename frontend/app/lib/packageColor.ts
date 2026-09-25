import type { CSSProperties } from "react";

// Package.color has two possible formats on file: legacy Tailwind
// background-color class names (e.g. "bg-green-600", from before the Color
// Picker existed) and real CSS color values (e.g. "#16a34a", from the Color
// Picker). Existing packages keep whatever legacy value they already have —
// never rewritten — so both formats have to render correctly side by side,
// forever. Tailwind can only generate CSS for class names it sees literally
// in source, so an arbitrary hex value can never work as a className; it
// always needs the style/backgroundColor path instead.
export function isLegacyPackageColorClass(color: string): boolean {
  return color.startsWith("bg-");
}

export function packageColorProps(color: string): { className: string; style?: CSSProperties } {
  if (isLegacyPackageColorClass(color)) {
    return { className: color };
  }
  if (!color.trim()) {
    return { className: "bg-gray-600" };
  }
  return { className: "", style: { backgroundColor: color } };
}

export function packageTextClass(color: string): string {
  if (isLegacyPackageColorClass(color)) {
    return /bg-(white|gray-100|gray-200|yellow-|lime-)/.test(color)
      ? "text-gray-900"
      : "text-white";
  }

  const hex = color.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!hex) return "text-white";

  const normalized = hex[1].length === 3
    ? hex[1].split("").map((digit) => `${digit}${digit}`).join("")
    : hex[1];
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.72 ? "text-gray-900" : "text-white";
}
