"use client";

import { packageColorProps } from "../../lib/packageColor";

// Curated presets roughly matching the app's existing accent palette, plus a
// native color input for a genuinely custom pick. Always emits a real CSS
// hex value — never a Tailwind class name; see lib/packageColor.ts for how
// callers render this alongside older packages' legacy Tailwind-class values.
const PRESET_COLORS = [
  { value: "#16a34a", label: "Green" },
  { value: "#2563eb", label: "Blue" },
  { value: "#9333ea", label: "Purple" },
  { value: "#f97316", label: "Orange" },
  { value: "#dc2626", label: "Red" },
  { value: "#0891b2", label: "Teal" },
  { value: "#db2777", label: "Pink" },
  { value: "#4b5563", label: "Gray" },
];

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const preview = packageColorProps(value);

  return (
    <div>
      {label && <label className="block text-sm text-gray-500 mb-1">{label}</label>}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`w-7 h-7 rounded-full border border-gray-300 shrink-0 ${preview.className}`}
          style={preview.style}
          title="Current color"
        />
        <span className="w-px h-6 bg-gray-200 mx-1" />
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onChange(c.value)}
            className={`w-7 h-7 rounded-full border-2 ${
              value === c.value ? "border-gray-900" : "border-transparent"
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
        <input
          type="color"
          value={HEX_COLOR_PATTERN.test(value) ? value : "#16a34a"}
          onChange={(e) => onChange(e.target.value)}
          title="Custom color"
          className="w-7 h-7 rounded-full border-2 border-gray-300 cursor-pointer p-0 overflow-hidden bg-transparent"
        />
      </div>
    </div>
  );
}
