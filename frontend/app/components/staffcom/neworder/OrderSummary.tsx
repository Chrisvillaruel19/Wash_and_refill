"use client";

import { ShoppingCart, X } from "lucide-react";
import { CartItem, PaymentMethod } from "../../../staff/(dashboard)/neworder/types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  total: number;
  change: number;
  onRemoveItem: (id: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  amountPaid: number;
  onAmountPaidChange: (amount: number) => void;
  onFinishTransaction: () => void;
  isSubmitting: boolean;
  submitError?: string;
}

export default function OrderSummary({
  cartItems,
  total,
  change,
  onRemoveItem,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  onFinishTransaction,
  isSubmitting,
  submitError,
}: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-fit lg:sticky lg:top-4">
      <div className="bg-blue-600 text-white flex items-center gap-2 px-4 sm:px-5 py-3">
        <ShoppingCart size={18} />
        <span className="font-semibold">Order Summary</span>
      </div>

      <div className="p-4 sm:p-5 space-y-3 overflow-y-auto max-h-[360px] min-h-[120px]">
        {cartItems.length > 0 ? (
          cartItems.map((item) => {
            const itemSubtotal = item.price * item.quantity;
            return (
              <div
                key={item.id}
                className="flex items-start gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 break-words leading-5">
                    {item.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(itemSubtotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-gray-400 hover:text-red-500"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full min-h-[120px] text-center text-gray-400 text-sm">
            Cart is empty.
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="order-payment-method" className="flex items-center min-h-5 text-xs sm:text-sm text-gray-600 mb-1 whitespace-nowrap">
              Payment Method
            </label>
            <select
              id="order-payment-method"
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
          </div>
          <div>
            <label htmlFor="order-amount-paid" className="flex items-center min-h-5 text-xs sm:text-sm text-gray-600 mb-1 whitespace-nowrap">
              Amount Paid
            </label>
            <input
              id="order-amount-paid"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              value={amountPaid || ""}
              onChange={(e) => onAmountPaidChange(Number(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
        </div>

        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-gray-600">Change</span>
          <span className={`font-semibold ${change < 0 ? "text-red-600" : "text-gray-900"}`}>
            {formatCurrency(change)}
          </span>
        </div>

        {submitError && (
          <p
            className="text-red-600 text-sm mb-3 bg-red-50 border border-red-200 rounded-lg py-2 px-3"
            role="alert"
          >
            {submitError}
          </p>
        )}

        <button
          type="button"
          onClick={onFinishTransaction}
          disabled={cartItems.length === 0 || isSubmitting}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Processing..." : "Finish Transaction"}
        </button>
      </div>
    </div>
  );
}