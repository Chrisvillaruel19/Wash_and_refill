"use client";

import { ShoppingCart, X } from "lucide-react";
import { CartItem, PaymentMethod } from "../../../staff/(dashboard)/neworder/types";
import FieldError from "../../FieldError";

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
  onRemoveItem: (id: string) => void;
  // "" = not chosen yet — required only when an amount is entered.
  paymentMethod: PaymentMethod | "";
  onPaymentMethodChange: (method: PaymentMethod) => void;
  amountPaid: number;
  onAmountPaidChange: (amount: number) => void;
  onFinishTransaction: () => void;
  isSubmitting: boolean;
  submitError?: string;
  paymentMethodError?: string;
  amountPaidError?: string;
}

export default function OrderSummary({
  cartItems,
  onRemoveItem,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  onFinishTransaction,
  isSubmitting,
  submitError,
  paymentMethodError,
  amountPaidError,
}: OrderSummaryProps) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const change = amountPaid - total;
  // Empty amount = saved as Unpaid; a partial amount is rejected on submit.
  const isUnpaid = amountPaid <= 0;
  const isShort = !isUnpaid && change < 0;
  // A laundry job (drop-off or self service), or a supply sale — supplies
  // only, paid now, straight to Sales like self service. A package without a
  // laundry service has nothing to wash; the server rejects it too.
  const hasLaundryService = cartItems.some((item) => item.sourceType === "SERVICE");
  const hasPackage = cartItems.some((item) => item.sourceType === "PACKAGE");
  const missingLaundryService = cartItems.length > 0 && !hasLaundryService && hasPackage;
  // Self Service lines carry no service type (Wash & Dry, Wash only…);
  // drop-off lines always do. The two are separate orders — the server
  // rejects a mix too.
  const mixesSelfAndDropOff =
    cartItems.some((item) => item.sourceType === "SERVICE" && !item.serviceType) &&
    cartItems.some((item) => item.sourceType === "SERVICE" && !!item.serviceType);

  return (
    // Desktop: stretched to the full height of the left column (see the
    // wrapper in neworder/page.tsx); the cart list takes the spare room and
    // scrolls inside when it's longer. Phones: sized to its content.
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-fit lg:absolute lg:inset-0 lg:h-auto">
      <div className="bg-blue-600 text-white flex items-center gap-2 px-4 sm:px-5 py-3">
        <ShoppingCart size={18} />
        <span className="font-semibold">Order Summary</span>
      </div>

      {/* Capped height so a long cart scrolls inside the list instead of
          stretching the whole Order Summary card. */}
      <div className="flex-1 p-4 sm:p-5 space-y-3 overflow-y-auto min-h-[150px] sm:min-h-[200px] max-h-[320px] lg:min-h-0 lg:max-h-none">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 break-words leading-5">{item.name}</p>
                {/* Only when it adds information — at 1 it just repeats the price. */}
                {item.quantity > 1 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.quantity} × {formatCurrency(item.price)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-sm text-gray-900">
                  {formatCurrency(item.price * item.quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  aria-label={`Remove ${item.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full min-h-[120px] text-center text-gray-400 text-sm">
            Cart is empty.
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-3 mb-4 items-start">
          <div>
            <label htmlFor="order-payment-method" className="flex items-center min-h-5 text-xs sm:text-sm text-gray-600 mb-1 whitespace-nowrap">
              Payment Method
            </label>
            <select
              id="order-payment-method"
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
              aria-invalid={!!paymentMethodError}
              aria-describedby={paymentMethodError ? "order-payment-method-error" : undefined}
              className={`w-full border rounded-lg p-2 text-gray-900 ${paymentMethodError ? "border-red-500" : "border-gray-300"}`}
            >
              <option value="" disabled>
                Select
              </option>
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
            <FieldError id="order-payment-method-error" message={paymentMethodError} />
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
              aria-invalid={!!amountPaidError}
              aria-describedby={amountPaidError ? "order-amount-paid-error" : undefined}
              className={`w-full border rounded-lg p-2 text-gray-900 ${amountPaidError ? "border-red-500" : "border-gray-300"}`}
            />
          </div>
          {/* Spans both columns: the amount message is too long for one. */}
          <div className="col-span-2 -mt-2 empty:hidden">
            {amountPaidError && <FieldError id="order-amount-paid-error" message={amountPaidError} />}
          </div>
        </div>

        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Total</span>
          <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-gray-600">Change</span>
          {/* Negative (in red) when the amount entered is below the total. */}
          <span className={`font-semibold ${isShort ? "text-red-600" : "text-gray-900"}`}>
            {isShort ? `-₱${(-change).toFixed(2)}` : `₱${isUnpaid ? "0.00" : change.toFixed(2)}`}
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

        {missingLaundryService && (
          <p className="text-amber-800 text-sm mb-3 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3" role="alert">
            Add at least one laundry service (e.g. Full Service or Self Service). A package has nothing to wash without one.
          </p>
        )}

        {mixesSelfAndDropOff && (
          <p className="text-amber-800 text-sm mb-3 bg-amber-50 border border-amber-200 rounded-lg py-2 px-3" role="alert">
            Self Service and drop-off laundry can&apos;t be in the same order. Create them as separate orders.
          </p>
        )}

        <button
          type="button"
          onClick={onFinishTransaction}
          disabled={cartItems.length === 0 || missingLaundryService || mixesSelfAndDropOff || isSubmitting}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Processing..." : "Finish Transaction"}
        </button>
      </div>
    </div>
  );
}
