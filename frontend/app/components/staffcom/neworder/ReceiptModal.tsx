"use client";

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  type: "PACKAGE" | "SERVICE" | "INVENTORY";
  serviceType?: string;
}

export interface OrderReceipt {
  id: string;
  customerName: string;
  phoneNumber: string;
  userName?: string;
  status?: string;
  paymentStatus?: "Paid" | "UnPaid";
  paymentMethod?: string;
  amountPaid: number;
  totalAmount: number;
  createdAt?: string;
  orderDetails: ReceiptLineItem[];
}

interface ReceiptModalProps {
  order: OrderReceipt | null;
  onClose: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTransactionCode(id: string): string {
  if (!id) return "TXN-000000";
  const compact = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `TXN-${compact || "000000"}`;
}

export default function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  if (!order) return null;

  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const isValidDate = !Number.isNaN(createdAt.getTime());
  const dateValue = isValidDate
    ? createdAt.toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";
  const timeValue = isValidDate
    ? createdAt.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
    : "N/A";
  const change = order.amountPaid - order.totalAmount;
  const statusLabel = order.status ?? "Pending";
  const paymentStatusLabel = order.paymentStatus ?? "UnPaid";
  const businessName = "Wash and Refill";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 receipt-overlay">
      <style jsx>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-print-only,
          .receipt-print-only * {
            visibility: visible;
          }
          .receipt-print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .receipt-no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="receipt-print-only w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl text-slate-800">
        <div className="mb-3 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">
            ✓
          </div>
          <h3 className="text-xl font-bold text-slate-800">Transaction completed!</h3>
        </div>

        <div className="border-b border-dashed border-slate-300 pb-2 mb-3 text-center">
          <h2 className="text-2xl font-black tracking-tight">{businessName}</h2>
          <p className="text-[10px] text-slate-500">Laundry Services</p>
        </div>

        <div className="space-y-1 text-[12px] leading-5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Txn #:</span>
            <span>{formatTransactionCode(order.id)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Date:</span>
            <span>{dateValue}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Time:</span>
            <span>{timeValue}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Status:</span>
            <span>{statusLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Payment Status:</span>
            <span>{paymentStatusLabel}</span>
          </div>
        </div>

        <div className="my-3 border-t border-dashed border-slate-300 pt-2 text-[12px] space-y-1">
          <p className="font-semibold">Customer:</p>
          <p>{order.customerName}</p>
          <p>{order.phoneNumber}</p>
        </div>

        <div className="my-3 border-t border-dashed border-slate-300 pt-2">
          <div className="grid grid-cols-[minmax(0,1.5fr)_auto_auto] gap-x-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Amt</span>
          </div>

          <div className="mt-2 space-y-2 text-[12px]">
            {order.orderDetails.map((item) => (
              <div key={`${item.name}-${item.type}-${item.unitPrice}`} className="grid grid-cols-[minmax(0,1.5fr)_auto_auto] items-start gap-x-2">
                <div className="min-w-0">
                  <p className="break-words leading-4 font-medium">{item.name}</p>
                </div>
                <span className="text-right">{item.quantity}</span>
                <div className="text-right">
                  <p>{formatCurrency(item.subtotal)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 border-t border-dashed border-slate-300 pt-2 space-y-1 text-[12px]">
          <div className="flex items-center justify-between gap-3">
            <span>Total:</span>
            <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Payment:</span>
            <span>{order.paymentMethod ?? "Cash"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Paid:</span>
            <span>{formatCurrency(order.amountPaid)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Change:</span>
            <span>{formatCurrency(change)}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-dashed border-slate-300 pt-2 text-center text-base font-black uppercase tracking-wide">
          Thank You!
        </div>

        <div className="receipt-no-print mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Print Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
