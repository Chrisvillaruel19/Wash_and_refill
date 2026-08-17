"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import InventoryTable from "../../../components/staffcom/inventory/InventoryTable";
import RestockModal from "../../../components/staffcom/inventory/RestockModal";
import AuthModal from "../../../components/staffcom/inventory/AuthModal";
import Pagination from "../../../components/staffcom/Pagination";
import { usePagination } from "../../../lib/usePagination";
import { getInventory, restockInventoryItem } from "../../../lib/services/inventoryApi.service";
import { ApiError } from "../../../lib/apiClient";
import { InventoryItem } from "../types";

const PAGE_SIZE = 8;

function InventoryPageContent() {
  const searchParams = useSearchParams();
  const lowStockOnly = searchParams.get("filter") === "lowStock";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [authTarget, setAuthTarget] = useState<InventoryItem | null>(null);

  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  // Held only in memory for the brief window between AuthModal succeeding
  // and RestockModal being confirmed or cancelled — never persisted to
  // localStorage/sessionStorage. This is the shared Restock Authorization
  // PIN an Admin set from their own account — not the Admin's password,
  // which this page never sees at all. Cleared on every path out of the
  // restock flow (confirm, cancel, or error).
  const [pin, setPin] = useState<string | null>(null);
  const [restocking, setRestocking] = useState(false);
  const [restockError, setRestockError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getInventory();
         
        setItems(data);
      } catch {
        setError("Unable to load inventory. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function requestRestock(item: InventoryItem) {
    setAuthTarget(item);
  }

  function handleAuthorized(enteredPin: string) {
    setRestockTarget(authTarget);
    setPin(enteredPin);
    setAuthTarget(null);
    setRestockError("");
  }

  function handleAuthCancel() {
    setAuthTarget(null);
  }

  function handleRestockCancel() {
    setRestockTarget(null);
    setPin(null);
    setRestockError("");
  }

  async function handleRestockConfirm(quantity: number) {
    if (!restockTarget) return;
    if (!pin) {
      // Reached only after a prior attempt already failed (see the catch
      // block below) — never silently no-op here, since a Staff member
      // re-clicking Confirm deserves to know why nothing is happening
      // rather than a frozen button.
      setRestockError("Your Restock Authorization PIN was rejected. Please cancel and try again.");
      return;
    }
    setRestocking(true);
    setRestockError("");
    try {
      const updatedItem = await restockInventoryItem(restockTarget.id, quantity, pin);
      setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      setRestockTarget(null);
      setPin(null);
    } catch (err) {
      // Surfacing the backend's actual message (rather than a generic one)
      // matters here specifically, so a Staff member who mistyped the PIN
      // knows exactly what went wrong rather than retrying blindly.
      setRestockError(err instanceof ApiError ? err.message : "Unable to restock item. Please try again.");
      // Always require the PIN to be re-entered after an error rather than
      // let a rejected value linger in this component's state.
      setPin(null);
    } finally {
      setRestocking(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = !lowStockOnly || item.currentStock <= item.lowStockAlert;
    return matchesSearch && matchesLowStock;
  });

  const { page, setPage, totalPages, paginatedItems } = usePagination(
    filteredItems,
    PAGE_SIZE,
    `${search}-${lowStockOnly}`
  );

  if (loading) {
    return <p className="text-gray-400 p-6">Loading inventory...</p>;
  }

  if (error) {
    return <p className="text-red-500 p-6">{error}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Laundry Supplies</h1>
      <div className="flex items-center gap-2 mb-6">
        <p className="text-gray-500">
          {lowStockOnly ? "Showing low stock items only" : "Manage your inventory items"}
        </p>
        {lowStockOnly && (
          <Link href="/staff/inventory" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Show all items
          </Link>
        )}
      </div>

      <InventoryTable
        items={paginatedItems}
        search={search}
        onSearchChange={setSearch}
        onRestockClick={requestRestock}
      />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {authTarget && (
        <AuthModal
          onAuthorized={handleAuthorized}
          onCancel={handleAuthCancel}
        />
      )}

      {restockTarget && (
        <RestockModal
          item={restockTarget}
          onConfirm={handleRestockConfirm}
          onCancel={handleRestockCancel}
          submitting={restocking}
          error={restockError}
        />
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-4 sm:p-6 text-gray-400">Loading inventory...</div>}>
      <InventoryPageContent />
    </Suspense>
  );
}
