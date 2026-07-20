"use client";

import { useEffect, useState } from "react";
import InventoryTable from "../../../components/staffcom/inventory/InventoryTable";
import RestockModal from "../../../components/staffcom/inventory/RestockModal";
import EditItemModal from "../../../components/staffcom/inventory/EditItemModal";
import AuthModal from "../../../components/staffcom/inventory/AuthModal";
import { getStoredInventory, restockItem, updateItem } from "../localInventory";
import { getCurrentUser } from "../../../lib/auth";
import { InventoryItem } from "../types";

type PendingAction = "restock" | "edit";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");

  const [authTarget, setAuthTarget] = useState<InventoryItem | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getStoredInventory());
  }, []);

  const staffName = getCurrentUser()?.name || "Unknown";

  function requestRestock(item: InventoryItem) {
    setAuthTarget(item);
    setPendingAction("restock");
  }

  function requestEdit(item: InventoryItem) {
    setAuthTarget(item);
    setPendingAction("edit");
  }

  function handleAuthorized() {
    if (pendingAction === "restock") {
      setRestockTarget(authTarget);
    } else if (pendingAction === "edit") {
      setEditTarget(authTarget);
    }
    setAuthTarget(null);
    setPendingAction(null);
  }

  function handleAuthCancel() {
    setAuthTarget(null);
    setPendingAction(null);
  }

  function handleRestockConfirm(quantity: number) {
    if (!restockTarget) return;
    const updated = restockItem(restockTarget.id, quantity, staffName);
    setItems(updated);
    setRestockTarget(null);
  }

  function handleEditSave(updates: Partial<InventoryItem>) {
    if (!editTarget) return;
    const updated = updateItem(editTarget.id, updates, staffName);
    setItems(updated);
    setEditTarget(null);
  }

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Laundry Supplies</h1>
      <p className="text-gray-500 mb-6">Manage your inventory items</p>

      <InventoryTable
        items={filteredItems}
        search={search}
        onSearchChange={setSearch}
        onRestockClick={requestRestock}
        onEditClick={requestEdit}
      />

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
          onCancel={() => setRestockTarget(null)}
        />
      )}

      {editTarget && (
        <EditItemModal
          item={editTarget}
          onSave={handleEditSave}
          onCancel={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}