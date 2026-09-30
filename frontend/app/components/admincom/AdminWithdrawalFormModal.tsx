"use client";

import { useEffect, useState } from "react";
import { useEscapeKey } from "../../lib/useEscapeKey";
import {
  AvailableToWithdraw,
  getAvailableToWithdraw,
  WithdrawalSource,
} from "../../lib/services/withdrawalApi.service";

export interface WithdrawalFormData {
  amount: number;
  reason: string;
  source: WithdrawalSource;
}

interface AdminWithdrawalFormModalProps {
  onSave: (data: WithdrawalFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function closedAt(endTime: string) {
  const when = new Date(endTime).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `Closed ${when}`;
}

function BreakdownRow({ label, detail, value }: { label: string; detail?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm text-gray-800">{label}</span>
        {detail && <span className="block text-xs text-gray-500">{detail}</span>}
      </span>
      <span className="text-sm font-medium text-gray-900 tabular-nums shrink-0">{value}</span>
    </div>
  );
}

export default function AdminWithdrawalFormModal({
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminWithdrawalFormModalProps) {
  useEscapeKey(onCancel);
  const [available, setAvailable] = useState<AvailableToWithdraw | null>(null);
  const [loadError, setLoadError] = useState("");
  const [source, setSource] = useState<WithdrawalSource>("Cash");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getAvailableToWithdraw()
      .then((a) => {
        setAvailable(a);
        // Start on whichever source actually has money.
        if (a.cash.total <= 0 && a.gcash.total > 0) setSource("GCash");
      })
      .catch(() => setLoadError("Unable to load available amounts. Close this and try again."));
  }, []);

  const total = available ? (source === "Cash" ? available.cash.total : available.gcash.total) : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (total <= 0) {
      setError(`There is no ${source} to withdraw right now.`);
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (Math.round(amount * 100) > Math.round(total * 100)) {
      setError(`Only ${peso(total)} ${source} is available.`);
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("A reason is required.");
      return;
    }
    if (trimmedReason.length > 500) {
      setError("Reason must be at most 500 characters.");
      return;
    }

    onSave({ amount, reason: trimmedReason, source });
  }

  const sourceCards: { key: WithdrawalSource; title: string; hint: string; value: number }[] = available
    ? [
        { key: "Cash", title: "Cash", hint: "From the drawer", value: available.cash.total },
        { key: "GCash", title: "GCash", hint: "From the GCash account", value: available.gcash.total },
      ]
    : [];

  const lastShift = available?.cash.lastShift;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-1 text-gray-900">Withdraw Earnings</h2>
        <p className="text-sm text-gray-500 mb-4">
          Take out the shop&apos;s earnings in one go.
          {available && <> The {peso(available.startingCash)} starting cash always stays in the drawer.</>}
        </p>

        {(loadError || error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {loadError || error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="block text-sm text-gray-500 mb-2">Withdraw from</legend>
            {!available && !loadError && <p className="text-sm text-gray-400">Loading available amounts...</p>}
            {available && (
              <div className="grid grid-cols-2 gap-2">
                {sourceCards.map((c) => {
                  const isSelected = c.key === source;
                  return (
                    <label
                      key={c.key}
                      className={`flex flex-col rounded-lg border p-3 cursor-pointer ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="withdraw-source"
                          value={c.key}
                          checked={isSelected}
                          onChange={() => {
                            setSource(c.key);
                            setAmount(0);
                            setError("");
                          }}
                          className="shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-900">{c.title}</span>
                      </span>
                      <span
                        className={`mt-1 text-lg font-bold tabular-nums ${
                          c.value > 0 ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {peso(c.value)}
                      </span>
                      <span className="text-xs text-gray-500">{c.value > 0 ? c.hint : "Nothing to withdraw"}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          {available && (
            <details className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <summary className="cursor-pointer text-blue-600 font-medium select-none">
                Show where the {source} comes from
              </summary>
              <div className="mt-2 divide-y divide-gray-100">
                {source === "Cash" ? (
                  <>
                    <BreakdownRow
                      label="Left from the last handover count"
                      detail={
                        lastShift
                          ? lastShift.available < 0
                            ? `${lastShift.staffName}'s shift · ${closedAt(lastShift.endTime)} · the count was short`
                            : `${lastShift.staffName}'s shift · ${closedAt(lastShift.endTime)}`
                          : "No handover yet"
                      }
                      value={peso(lastShift?.available ?? 0)}
                    />
                    <BreakdownRow
                      label="Open shift so far"
                      detail={
                        available.cash.openShift === 0
                          ? "No cash sales since the last handover"
                          : "Cash sales minus expenses and withdrawals"
                      }
                      value={peso(available.cash.openShift)}
                    />
                    <BreakdownRow
                      label="Starting cash"
                      detail="Stays in the drawer — not withdrawable"
                      value={peso(available.startingCash)}
                    />
                  </>
                ) : available.gcash.shifts.length > 0 ? (
                  available.gcash.shifts.map((s) => (
                    <BreakdownRow
                      key={s.handoverId}
                      label={`${s.staffName}'s shift`}
                      detail={closedAt(s.endTime)}
                      value={peso(s.available)}
                    />
                  ))
                ) : (
                  <p className="py-1.5 text-gray-500">No GCash left to withdraw.</p>
                )}
                <p className="pt-2 text-xs text-gray-500">
                  {source === "Cash"
                    ? "Taken from the last handover's leftover first, then from the open shift."
                    : "Taken from the oldest shift first."}{" "}
                  Each shift is recorded separately in the history.
                </p>
              </div>
            </details>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="withdrawal-amount" className="block text-sm text-gray-500">Amount</label>
              {total > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(total);
                    setError("");
                  }}
                  className="text-xs font-medium text-blue-600 hover:underline min-h-[32px] px-1"
                >
                  Withdraw all {peso(total)}
                </button>
              )}
            </div>
            <input
              id="withdrawal-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={amount || ""}
              disabled={total <= 0}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label htmlFor="withdrawal-reason" className="block text-sm text-gray-500 mb-1">Reason</label>
            <textarea
              id="withdrawal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !available || total <= 0}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
