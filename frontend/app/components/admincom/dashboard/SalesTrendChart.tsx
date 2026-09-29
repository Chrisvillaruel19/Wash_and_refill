"use client";

import { useState } from "react";
import CardHeader from "./CardHeader";
import { peso, pesoShort } from "./format";

interface SalesTrendChartProps {
  // Oldest → newest, "YYYY-MM-DD" business days.
  days: { date: string; total: number }[];
}

const CHART_HEIGHT = 140; // px, plot area only

function dayLabel(date: string, isToday: boolean) {
  if (isToday) return "Today";
  // Parse as UTC midnight so the weekday matches the business date itself.
  return new Date(`${date}T00:00:00Z`).toLocaleDateString([], { weekday: "short", timeZone: "UTC" });
}

// Single-series column chart: one colour for every bar. Tapping (phones)
// or hovering (desktop) a day shows its value in the readout line above
// the bars — hover-only tooltips don't work on touch screens. Today is
// selected by default. A visually hidden table carries the same numbers
// for screen readers.
export default function SalesTrendChart({ days }: SalesTrendChartProps) {
  const [selected, setSelected] = useState(days.length - 1);
  const max = Math.max(...days.map((d) => d.total), 0);
  const weekTotal = days.reduce((sum, d) => sum + d.total, 0);
  const current = days[selected];

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 h-full flex flex-col">
      <CardHeader title="Sales, last 7 days" linkHref="/admin/sales" linkLabel="View sales" />

      {days.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">No sales data yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm mb-3" aria-live="polite">
            <span className="text-gray-500">
              {current ? dayLabel(current.date, selected === days.length - 1) : ""}:{" "}
              <span className="font-semibold text-gray-900">{peso(current?.total ?? 0)}</span>
            </span>
            <span className="text-gray-500">
              Week <span className="font-semibold text-gray-900">{peso(weekTotal)}</span>
            </span>
          </div>

          <div className="flex items-end gap-1 sm:gap-2 border-b border-gray-200" style={{ height: CHART_HEIGHT + 18 }}>
            {days.map((d, i) => {
              const isSelected = i === selected;
              const barHeight = max > 0 ? Math.max((d.total / max) * CHART_HEIGHT, d.total > 0 ? 3 : 0) : 0;
              return (
                // The whole column is the tap/hover target — much wider than the bar.
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelected(i)}
                  onMouseEnter={() => setSelected(i)}
                  aria-pressed={isSelected}
                  aria-label={`${dayLabel(d.date, i === days.length - 1)}: ${peso(d.total)}`}
                  className="flex-1 h-full flex flex-col justify-end items-center rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  {isSelected && d.total > 0 && (
                    <span className="text-[11px] font-semibold text-gray-900 mb-1 whitespace-nowrap">
                      {pesoShort(d.total)}
                    </span>
                  )}
                  <span
                    className={`block w-full max-w-[24px] rounded-t ${isSelected ? "bg-blue-600" : "bg-blue-600/45"}`}
                    style={{ height: barHeight }}
                  />
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 sm:gap-2 mt-1.5">
            {days.map((d, i) => (
              <span
                key={d.date}
                className={`flex-1 text-center text-[11px] ${i === selected ? "text-gray-900 font-semibold" : "text-gray-500"}`}
              >
                {dayLabel(d.date, i === days.length - 1)}
              </span>
            ))}
          </div>

          <table className="sr-only">
            <caption>Sales per day, last 7 days</caption>
            <thead>
              <tr>
                <th>Day</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{peso(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
