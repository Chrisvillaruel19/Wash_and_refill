"use client";

import { useEffect, useRef, useState } from "react";
import { Search, CheckCircle2, Upload } from "lucide-react";
import { getStoredExpenses, addExpense } from "../localExpense";
import { getCurrentUser } from "../../../lib/auth";
import { ExpenseRecord, ExpenseCategory } from "../types";
import ExpandableText from "../../../components/staffcom/ExpandableText";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";

const PAGE_SIZE = 6;

const categories: ExpenseCategory[] = [
  "Supplies & Materials",
  "Utilities",
  "Equipment Repair",
  "Rent",
  "Other",
];

export default function Expense() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState<ExpenseCategory>("Supplies & Materials");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const staffName = getCurrentUser()?.name || "Unknown";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpenses(getStoredExpenses());
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (amount <= 0) return;
    const updated = addExpense({ amount, category, description, submittedBy: staffName, imageDataUrl });
    setExpenses(updated);
    setAmount(0);
    setCategory("Supplies & Materials");
    setDescription("");
    setImageDataUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const filteredExpenses = expenses.filter((e) =>
    new Date(e.timestamp).toLocaleDateString().includes(search)
  );

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredExpenses,
    PAGE_SIZE,
    search
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="text-lg font-bold text-gray-900">Expense History</h2>
        <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Date"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            name="expense-search-date"
            autoComplete="off"
            className="w-full pl-9 pr-4 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <h3 className="text-blue-600 font-semibold mb-4">Submit New Expense</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount</label>
            <input
              type="number"
              min={0}
              value={amount || ""}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSubmit}
            disabled={amount <= 0}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={18} /> Submit Expense
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed explanation of the expense (what was purchased, why it was necessary, etc.)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Receipt</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors overflow-hidden"
            >
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageDataUrl} alt="Receipt preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={20} />
                  <span className="text-xs mt-1">Upload Image</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">
                  {new Date(e.timestamp).toLocaleDateString()}{" "}
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {"  ·  "}
                  <span className="font-medium text-gray-700">Category: {e.category}</span>
                </p>
                <p className="text-sm text-gray-900 mt-1 truncate" title={e.submittedBy}>
                  <span className="font-semibold">Submitted:</span> {e.submittedBy}
                </p>
                <ExpandableText
                  label="Description:"
                  text={e.description || "—"}
                  className="text-sm text-gray-600 mt-1"
                />
              </div>
              {e.imageDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.imageDataUrl}
                  alt="Receipt"
                  className="w-20 h-20 rounded-lg object-cover shrink-0"
                />
              )}
              <p className="text-xl font-bold text-gray-900 shrink-0">₱{e.amount.toFixed(2)}</p>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-400">
            No expenses recorded yet.
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
