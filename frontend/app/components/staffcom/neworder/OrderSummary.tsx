"use client";

import { ShoppingCart, X } from "lucide-react";
import { CartItem, PaymentMethod } from "../../../staff/(dashboard)/neworder/types";

interface OrderSummaryProps {
  cartItems: CartItem[];
  onRemoveItem: (id: string) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  amountPaid: number;
  onAmountPaidChange: (amount: number) => void;
  onFinishTransaction: () => void;
}

export default function OrderSummary({
  cartItems,
  onRemoveItem,
  paymentMethod,
  onPaymentMethodChange,
  amountPaid,
  onAmountPaidChange,
  onFinishTransaction,
}: OrderSummaryProps) {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const change = amountPaid - total;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-full">
      <div className="bg-blue-600 text-white flex items-center gap-2 px-4 sm:px-5 py-3">
        <ShoppingCart size={18} />
        <span className="font-semibold">Order Summary</span>
      </div>

      <div className="flex-1 p-4 sm:p-5 space-y-3 overflow-y-auto min-h-[150px] sm:min-h-[200px]">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b border-gray-100 pb-2 gap-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.quantity} × ₱{item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="font-semibold text-sm sm:text-base text-gray-900">
                  ₱{(item.price * item.quantity).toFixed(2)}
                </span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-sm text-center mt-8">Cart is empty.</p>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Payment method:</label>
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            >
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount:</label>
            <input
              type="number"
              placeholder="Input amount"
              value={amountPaid || ""}
              onChange={(e) => onAmountPaidChange(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
        </div>

        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Total</span>
          <span className="font-semibold text-gray-900">₱{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-gray-600">Change</span>
          <span className="font-semibold text-gray-900">₱{change > 0 ? change.toFixed(2) : "0.00"}</span>
        </div>

        <button
          onClick={onFinishTransaction}
          disabled={cartItems.length === 0}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Finish Transaction
        </button>
      </div>
    </div>
  );
}