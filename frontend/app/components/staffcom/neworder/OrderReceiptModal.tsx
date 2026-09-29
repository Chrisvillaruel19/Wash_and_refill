"use client";

import Image from "next/image";
import { Printer, CheckCircle2 } from "lucide-react";
import { OrderReceipt } from "../../../lib/services/ordersApi.service";
import { useEscapeKey } from "../../../lib/useEscapeKey";

interface OrderReceiptModalProps {
  receipt: OrderReceipt;
  onClose: () => void;
}

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Shown right after New Order's "Finish Transaction" succeeds. Print uses
// the browser's own print dialog; the <style> below hides everything on
// the page except #order-receipt while printing, sized for 80mm receipt
// paper (still prints fine on A4).
export default function OrderReceiptModal({ receipt, onClose }: OrderReceiptModalProps) {
  useEscapeKey(onClose);
  const created = new Date(receipt.createdAt);
  const isPaid = receipt.payStatus === "Paid";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:bg-transparent">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          body * { visibility: hidden !important; }
          #order-receipt, #order-receipt * { visibility: visible !important; }
          #order-receipt { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; max-height: none; overflow: visible; }
        }
      `}</style>

      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-2 px-5 pt-5 text-green-600 print:hidden">
          <CheckCircle2 size={20} />
          <span className="font-semibold">Transaction completed</span>
        </div>

        <div id="order-receipt" className="overflow-y-auto px-5 py-4 text-gray-900 text-sm font-mono">
          <div className="text-center mb-3">
            <Image src="/LOGO.png" alt="" width={56} height={56} className="mx-auto mb-1" />
            <p className="font-bold text-base font-sans">Wash &amp; Refill Laundry</p>
            <p className="text-xs text-gray-500">Official Order Receipt</p>
          </div>

          <div className="border-t border-dashed border-gray-400 py-2 space-y-0.5 text-xs">
            <Row label="Order #" value={receipt.orderNumber} />
            <Row
              label="Date"
              value={`${created.toLocaleDateString()} ${created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            />
            {receipt.staffName && <Row label="Staff" value={receipt.staffName} />}
            <Row label="Customer" value={receipt.customer} />
            <Row label="Phone" value={receipt.contact} />
          </div>

          <div className="border-t border-dashed border-gray-400 py-2 space-y-2">
            {receipt.lines.map((line, i) => (
              <div key={i}>
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">{line.label}</span>
                  <span className="shrink-0">{peso(line.subtotal)}</span>
                </div>
                {line.detail && <p className="text-xs text-gray-500">{line.detail}</p>}
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-400 py-2 space-y-0.5">
            <Row label="TOTAL" value={peso(receipt.total)} bold />
            {isPaid ? (
              <>
                <Row label={`Paid (${receipt.paymentMethod ?? "Cash"})`} value={peso(receipt.amountPaid)} />
                <Row label="Change" value={peso(receipt.change)} />
              </>
            ) : (
              <Row label="Balance due" value={peso(receipt.total)} />
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 pt-3 text-center">
            <span
              className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold font-sans border ${
                isPaid ? "text-green-700 border-green-400" : "text-red-600 border-red-400"
              }`}
            >
              {isPaid ? "PAID" : "UNPAID"}
            </span>
            <p className="text-xs text-gray-500 mt-2">
              Please present this receipt when claiming your laundry. Thank you!
            </p>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold text-base" : ""}`}>
      <span className="text-gray-600 shrink-0">{label}</span>
      <span className="text-right break-all">{value}</span>
    </div>
  );
}
