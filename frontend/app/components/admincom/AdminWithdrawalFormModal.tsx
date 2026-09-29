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
  // Omitted = the open shift's drawer.
  fromHandoverId?: string;
}

interface AdminWithdrawalFormModalProps {
  onSave: (data: WithdrawalFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  submitError?: string;
}

// One selectable place money can be withdrawn from.
interface SourceOption {
  key: string;
  title: string;
  detail: string;
  source: WithdrawalSource;
  fromHandoverId?: string;
  available: number;
}

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildOptions(a: AvailableToWithdraw): SourceOption[] {
  const options: SourceOption[] = [
    {
      key: "open",
      title: "Open shift — cash drawer",
      detail: `Starting cash ${peso(a.startingCash)} stays in the drawer`,
      source: "Cash",
      available: a.openShiftCash,
    },
  ];
  for (const s of a.shifts) {
    const when = new Date(s.endTime).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    if (s.cashAvailable > 0) {
      options.push({
        key: `${s.handoverId}-cash`,
        title: `${s.staffName}'s shift — Cash`,
        detail: `Closed ${when} · counted cash minus starting cash`,
        source: "Cash",
        fromHandoverId: s.handoverId,
        available: s.cashAvailable,
      });
    }
    if (s.gcashAvailable > 0) {
      options.push({
        key: `${s.handoverId}-gcash`,
        title: `${s.staffName}'s shift — GCash`,
        detail: `Closed ${when} · GCash sales`,
        source: "GCash",
        fromHandoverId: s.handoverId,
        available: s.gcashAvailable,
      });
    }
  }
  return options;
}

export default function AdminWithdrawalFormModal({
  onSave,
  onCancel,
  submitting,
  submitError,
}: AdminWithdrawalFormModalProps) {
  useEscapeKey(onCancel);
  const [options, setOptions] = useState<SourceOption[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getAvailableToWithdraw()
      .then((a) => setOptions(buildOptions(a)))
      .catch(() => setLoadError("Unable to load available amounts. Close this and try again."));
  }, []);

  const selected = options?.find((o) => o.key === selectedKey);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selected) {
      setError("Choose where to withdraw from.");
      return;
    }
    if (!amount || amount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (Math.round(amount * 100) > Math.round(selected.available * 100)) {
      setError(`Only ${peso(selected.available)} is available from this source.`);
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

    onSave({
      amount,
      reason: trimmedReason,
      source: selected.source,
      fromHandoverId: selected.fromHandoverId,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-5 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-1 text-gray-900">Cash Withdrawal</h2>
        <p className="text-sm text-gray-500 mb-4">
          Withdraw the open drawer&apos;s cash or a closed shift&apos;s earnings. The starting cash is never
          included.
        </p>

        {(loadError || error || submitError) && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">
            {loadError || error || submitError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="block text-sm text-gray-500 mb-2">Withdraw from</legend>
            {!options && !loadError && <p className="text-sm text-gray-400">Loading available amounts...</p>}
            {options && (
              <div className="space-y-2">
                {options.map((o) => {
                  const disabled = o.available <= 0;
                  const isSelected = o.key === selectedKey;
                  return (
                    <label
                      key={o.key}
                      className={`flex items-start gap-3 rounded-lg border p-3 min-h-[44px] ${
                        disabled
                          ? "opacity-50 cursor-not-allowed"
                          : isSelected
                            ? "border-blue-500 bg-blue-50 cursor-pointer"
                            : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      <input
                        type="radio"
                        name="withdraw-from"
                        value={o.key}
                        checked={isSelected}
                        disabled={disabled}
                        onChange={() => {
                          setSelectedKey(o.key);
                          setError("");
                        }}
                        className="mt-1 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-gray-900 text-sm">{o.title}</span>
                          <span className="font-semibold text-gray-900 text-sm tabular-nums shrink-0">
                            {peso(o.available)}
                          </span>
                        </span>
                        <span className="block text-xs text-gray-500">{o.detail}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label htmlFor="withdrawal-amount" className="block text-sm text-gray-500">Amount</label>
              {selected && selected.available > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(selected.available)}
                  className="text-xs font-medium text-blue-600 hover:underline min-h-[32px] px-1"
                >
                  Use full {peso(selected.available)}
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
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
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
              disabled={submitting || !options}
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
