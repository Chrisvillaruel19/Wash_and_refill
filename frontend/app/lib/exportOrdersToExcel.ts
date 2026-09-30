import { formatGroupedItems } from "./groupItems";
import { Order } from "../staff/(dashboard)/types";

const PESO_FORMAT = '"₱"#,##0.00';

// Builds a real .xlsx (not CSV) with two sheets — every order, and one row
// per customer (grouped by name + contact) — and triggers a download.
// exceljs is imported on demand so it never lands in the page's initial
// bundle; it's only needed once someone actually clicks Export.
export async function exportOrdersToExcel(orders: Order[], fileName: string): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const ordersSheet = workbook.addWorksheet("Orders", { views: [{ state: "frozen", ySplit: 1 }] });
  ordersSheet.columns = [
    { header: "Customer", key: "customer", width: 24 },
    { header: "Contact", key: "contact", width: 16 },
    { header: "Date", key: "date", width: 20, style: { numFmt: "m/d/yyyy h:mm AM/PM" } },
    { header: "Staff", key: "staff", width: 18 },
    { header: "Laundry Items", key: "items", width: 50 },
    { header: "Total", key: "total", width: 14, style: { numFmt: PESO_FORMAT } },
    { header: "Status", key: "status", width: 14 },
    { header: "Payment", key: "payStatus", width: 12 },
    { header: "Payment Method", key: "paymentMethod", width: 16 },
  ];
  for (const order of orders) {
    ordersSheet.addRow({
      customer: order.customer,
      contact: order.contact,
      date: order.createdAt ? new Date(order.createdAt) : order.date,
      staff: order.staffName || "N/A",
      items: order.items && order.items.length > 0 ? formatGroupedItems(order.items) : "",
      total: order.amount,
      status: order.status,
      payStatus: order.payStatus === "Paid" ? "Paid" : "Unpaid",
      // Never blank: unpaid orders have no method yet, and orders settled
      // via Mark as Paid (which doesn't capture a method) say so explicitly.
      paymentMethod: order.paymentMethod ?? (order.payStatus === "Paid" ? "Not recorded" : "—"),
    });
  }

  const customers = new Map<
    string,
    { customer: string; contact: string; orders: number; spent: number; first?: Date; last?: Date }
  >();
  for (const order of orders) {
    const key = `${order.customer.trim().toLowerCase()}|${order.contact.trim()}`;
    const entry = customers.get(key) ?? { customer: order.customer, contact: order.contact, orders: 0, spent: 0 };
    entry.orders += 1;
    // Cancelled orders never became sales, so they don't count as spend.
    if (order.status !== "Cancelled") entry.spent += order.amount;
    if (order.createdAt) {
      const created = new Date(order.createdAt);
      if (!entry.first || created < entry.first) entry.first = created;
      if (!entry.last || created > entry.last) entry.last = created;
    }
    customers.set(key, entry);
  }

  const customersSheet = workbook.addWorksheet("Customers", { views: [{ state: "frozen", ySplit: 1 }] });
  customersSheet.columns = [
    { header: "Customer", key: "customer", width: 24 },
    { header: "Contact", key: "contact", width: 16 },
    { header: "Total Orders", key: "orders", width: 14 },
    { header: "Total Spent", key: "spent", width: 16, style: { numFmt: PESO_FORMAT } },
    { header: "First Order", key: "first", width: 14, style: { numFmt: "m/d/yyyy" } },
    { header: "Last Order", key: "last", width: 14, style: { numFmt: "m/d/yyyy" } },
  ];
  const sortedCustomers = [...customers.values()].sort((a, b) => a.customer.localeCompare(b.customer));
  for (const entry of sortedCustomers) {
    customersSheet.addRow(entry);
  }

  for (const sheet of [ordersSheet, customersSheet]) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
