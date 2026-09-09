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
  return { className: "", style: { backgroundColor: color } };
}
