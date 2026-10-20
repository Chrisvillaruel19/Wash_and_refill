"use client";

import { useState } from "react";
import { useEscapeKey } from "../../lib/useEscapeKey";
import { useFieldErrors } from "../../lib/useFieldErrors";
import FieldError from "../FieldError";
import { Order, PaymentMethod } from "../../staff/(dashboard)/types";

export interface RefundFormData {
  amount: number;
  method: PaymentMethod;
  reason: string;
}

interface RefundOrderModalProps {
  order: Order;
  onConfirm: (data: RefundFormData) => void;
  onCancel: () => void;
  submitting?: boolean;
  // Server answer only (e.g. already fully refunded); field problems
  // show under their own field.
  error?: string;
}

const toCents = (n: number) => Math.round(n * 100);
const peso = (n: number) => `₱${n.toFixed(2)}`;

// Admin-only. One refund transaction for a paid order — partial allowed,
// never more than what's left to refund, always the way the customer paid. A
// claimed order's refund is taken from the earnings available to withdraw;
// staff sales never change. The original sale is never edited.
export default function RefundOrderModal({ order, onConfirm, onCancel, submitting, error }: RefundOrderModalProps) {
  useEscapeKey(onCancel);
  const remaining = Math.max(0, (toCents(order.amount) - toCents(order.refundedAmount)) / 100);
  // Nothing was delivered on a cancelled order, so it's always refunded in
  // full (the server enforces it too); only claimed orders can be partial.
  const fullOnly = order.status === "Cancelled";

  const [amount, setAmount] = useState(remaining.toFixed(2));
  // Always paid back the way the customer paid (the server enforces it), so
  // cash and GCash each add up on their own.
  const method: PaymentMethod = order.paymentMethod ?? "Cash";
  const [reason, setReason] = useState(order.status === "Cancelled" ? "Order cancelled" : "");
  const fields = useFieldErrors<"amount" | "reason">("refund");
  const base = "w-full border rounded-lg p-2 text-gray-900";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    const trimmedReason = reason.trim();
    const valid = fields.setErrors({
      amount: !amount
        ? "Amount is required."
        : !Number.isFinite(parsed) || parsed <= 0
          ? "Enter an amount greater than zero."
          : Math.abs(parsed * 100 - Math.round(parsed * 100)) > 1e-6
            ? "Amount can have at most 2 decimal places."
            : toCents(parsed) > toCents(remaining)
              ? `Only ${peso(remaining)} can still be refunded.`
              : "",
      reason: !reason
        ? "A reason is required."
        : !trimmedReason
          ? "Invalid reason."
          : trimmedReason.length > 500
            ? "Reason must be at most 500 characters."
            : "",
    });
    if (!valid) return;
    onConfirm({ amount: Math.round(parsed * 100) / 100, method, reason: trimmedReason });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-1 text-gray-900">Refund Order</h2>
        <p className="text-sm text-gray-600 mb-4">
          {order.customer} · paid {peso(order.amount)}
          {order.paymentMethod ? ` by ${order.paymentMethod}` : ""}
          {order.refundedAmount > 0 && <> · already refunded {peso(order.refundedAmount)}</>}
        </p>

        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg py-2 px-3">{error}</p>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="refund-amount" className="block text-sm text-gray-500 mb-1">
              {fullOnly ? "Amount to refund (cancelled — full amount)" : `Amount to refund (up to ${peso(remaining)})`}
            </label>
            <input
              id="refund-amount"
              type="number"
              min={0.01}
              step={0.01}
              value={amount}
              readOnly={fullOnly}
              onChange={(e) => {
                setAmount(e.target.value);
                fields.clear("amount");
              }}
              {...fields.inputProps("amount", `${base} ${fullOnly ? "bg-gray-50 cursor-not-allowed" : ""}`)}
            />
            {!fullOnly && (
              <p className="text-xs text-gray-500 mt-1">
                Claimed order — refund part of it for e.g. a damaged item, or the full amount.
              </p>
            )}
            <FieldError id={fields.errorId("amount")} message={fields.errors.amount} />
          </div>

          <fieldset>
            <legend className="block text-sm text-gray-500 mb-1">Refund by</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["Cash", "GCash"] as PaymentMethod[]).map((m) => {
                const disabled = m !== method;
                return (
                  <label
                    key={m}
                    className={`flex items-center gap-2 rounded-lg border p-2 ${
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    } ${method === m ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50"}`}
                  >
                    <input
                      type="radio"
                      name="refund-method"
                      value={m}
                      checked={method === m}
                      disabled={disabled}
                      readOnly
                    />
                    <span className="text-sm font-medium text-gray-900">{m}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {fullOnly
                ? method === "Cash"
                  ? "Staff set this cash aside when they cancelled. Once you refund, it shows Refunded and staff give it to the customer — the drawer isn't affected."
                  : "Send it back to the customer through GCash. It was never counted as GCash income, so the GCash balance isn't affected."
                : method === "Cash"
                  ? "Paid by cash, so refunded by cash. The staff on duty will see \"Refunds to give\", hand the cash to the customer from the drawer and mark it given — their Shift Handover then expects that much less. Until then it's held back from the cash available to withdraw."
                  : "Paid by GCash, so refunded by GCash. Send it from the shop's GCash — it comes off the GCash available to withdraw."}
            </p>
          </fieldset>

          <div>
            <label htmlFor="refund-reason" className="block text-sm text-gray-500 mb-1">Reason</label>
            <textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                fields.clear("reason");
              }}
              rows={2}
              maxLength={500}
              placeholder="e.g. Damaged item, order cancelled"
              {...fields.inputProps("reason", `${base} resize-none`)}
            />
            <FieldError id={fields.errorId("reason")} message={fields.errors.reason} />
          </div>

          <p className="text-xs text-gray-500">
            {fullOnly
              ? "This cancelled order was never counted as a sale, so refunding it doesn't change any sales figures."
              : "Staff sales don't change. The original sale stays in past reports; this refund is recorded today and subtracted from today's sales."}
          </p>

          <div className="flex justify-end gap-3 pt-1">
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
              disabled={submitting}
              className="px-5 py-2 rounded-lg border border-red-400 text-red-500 font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {submitting ? "Refunding..." : "Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
