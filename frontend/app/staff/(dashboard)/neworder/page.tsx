"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Shirt, LayoutGrid } from "lucide-react";
import CustomerInfoForm from "../../../components/staffcom/neworder/CustomerInfoForm";
import PackageGrid from "../../../components/staffcom/neworder/PackageGrid";
import OrderSummary from "../../../components/staffcom/neworder/OrderSummary";
import NewOrderModals from "../../../components/staffcom/neworder/NewOrderModals";
import { ServiceCategory, CartItem, PaymentMethod, Package, ServiceItem, SupplyItem, ServiceType } from "./types";
import { InventoryItem } from "../types";
import { serviceCategories } from "./data";
import { getPackages } from "../../../lib/services/packageApi.service";
import { getServices } from "../../../lib/services/laundryServiceApi.service";
import { getInventory } from "../../../lib/services/inventoryApi.service";
import { createOrder, NewOrderItemInput } from "../../../lib/services/ordersApi.service";
import { ApiError } from "../../../lib/apiClient";
import { alertSuccess } from "../../../lib/alerts";
import { isValidPhone, PHONE_ERROR_MESSAGE, isValidName, NAME_ERROR_MESSAGE } from "../../../lib/validation";

// Two inventory rows can share a display name (e.g. "Liquid Detergent" in
// Sachet vs Liters) — suffix with unit only when a name collides, same
// disambiguation used at checkout time and in Admin Catalog.
function buildSupplyMenu(inventory: InventoryItem[]): SupplyItem[] {
  const nameCounts = new Map<string, number>();
  inventory.forEach((i) => nameCounts.set(i.name, (nameCounts.get(i.name) || 0) + 1));
  return inventory.map((i) => ({
    id: i.id,
    name: (nameCounts.get(i.name) || 0) > 1 ? `${i.name} (${i.unit})` : i.name,
    price: i.price,
    unit: i.unit,
  }));
}

export default function NewOrderPage() {
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // React state updates aren't guaranteed to re-render before a second click
  // event is dispatched, so the actual re-entrancy guard is this ref (set
  // synchronously, immediately) — isSubmitting state just drives the UI.
  const isSubmittingRef = useRef(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const [pkgs, svcs, inv] = await Promise.all([getPackages(), getServices(), getInventory()]);
        setPackages(pkgs);
        setServices(svcs);
        setInventory(inv);
      } catch {
        setLoadError("Unable to load catalog. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const supplies = useMemo(() => buildSupplyMenu(inventory), [inventory]);

  function addToCart(newItem: CartItem) {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.sourceType === newItem.sourceType &&
          item.sourceId === newItem.sourceId &&
          item.price === newItem.price &&
          item.weight === newItem.weight &&
          item.serviceType === newItem.serviceType
      );
      if (existingIndex !== -1) {
        return prev.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + newItem.quantity } : item
        );
      }
      return [...prev, newItem];
    });
  }

  function addItemToCart(
    name: string,
    price: number,
    sourceType: CartItem["sourceType"],
    sourceId: string,
    quantity = 1,
    weight?: number,
    serviceType?: ServiceType
  ) {
    addToCart({
      id: `${Date.now()}-${Math.random()}`,
      name,
      price,
      quantity,
      sourceType,
      sourceId,
      weight,
      serviceType,
    });
  }

  function removeFromCart(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleCategorySelect(category: ServiceCategory) {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  }

  function handleServiceConfirm(result: {
    itemId: string;
    itemName: string;
    quantityKg: number;
    serviceType: ServiceType;
    total: number;
  }) {
    addItemToCart(
      `${result.itemName} (${result.serviceType}, ${result.quantityKg}kg)`,
      result.total,
      "SERVICE",
      result.itemId,
      1,
      result.quantityKg,
      result.serviceType
    );
    setSelectedCategory(null);
  }

  function handleSupplyAdd(supply: { id: string; name: string; price: number }, quantity: number) {
    addItemToCart(supply.name, supply.price, "INVENTORY", supply.id, quantity);
  }

  function handlePackageAdd(pkg: { id: string; name: string; price: number }) {
    addItemToCart(pkg.name, pkg.price, "PACKAGE", pkg.id, 1);
  }

  async function handleFinishTransaction() {
    if (cartItems.length === 0 || isSubmittingRef.current) return;

    const trimmedName = customerName.trim();
    if (!isValidName(trimmedName)) {
      setSubmitError(NAME_ERROR_MESSAGE);
      return;
    }
    const trimmedPhone = phoneNumber.trim();
    if (!isValidPhone(trimmedPhone)) {
      setSubmitError(PHONE_ERROR_MESSAGE);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    const items: NewOrderItemInput[] = cartItems.map((item) => {
      if (item.sourceType === "PACKAGE") {
        return { type: "PACKAGE", packageId: item.sourceId, quantity: item.quantity };
      }
      if (item.sourceType === "SERVICE") {
        return {
          type: "SERVICE",
          serviceId: item.sourceId,
          weight: item.weight ?? 1,
          quantity: item.quantity,
          serviceType: item.serviceType,
        };
      }
      return { type: "INVENTORY", inventoryId: item.sourceId, quantity: item.quantity };
    });

    try {
      await createOrder({
        customerName: trimmedName,
        phoneNumber: trimmedPhone,
        paymentMethod,
        amountPaid,
        items,
      });

      alertSuccess("Transaction completed!", "Check your dashboard for the updated summary.");
      setCartItems([]);
      setCustomerName("");
      setPhoneNumber("");
      setAmountPaid(0);

      // Stock was just consumed by the backend as part of order creation —
      // refresh so the Supplies menu reflects current quantities for the
      // next transaction instead of the numbers fetched on page load.
      try {
        setInventory(await getInventory());
      } catch {
        // Non-fatal: the completed order already succeeded. The Supplies
        // menu just stays on slightly stale numbers until next reload.
      }
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Unable to complete transaction. Please try again."
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-gray-400 p-6">Loading catalog...</p>;
  }

  if (loadError) {
    return <p className="text-red-500 p-6">{loadError}</p>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CustomerInfoForm
            customerName={customerName}
            phoneNumber={phoneNumber}
            onNameChange={setCustomerName}
            onPhoneChange={setPhoneNumber}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="border border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Shirt size={22} className="text-blue-600" />
              <span className="font-semibold text-gray-900">Laundry Services</span>
            </button>
            <button
              onClick={() => setShowSuppliesModal(true)}
              className="border border-gray-300 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <LayoutGrid size={22} className="text-green-600" />
              <span className="font-semibold text-gray-900">Laundry Supplies</span>
            </button>
          </div>

          <PackageGrid packages={packages} onAdd={handlePackageAdd} />
        </div>

        <div>
          <OrderSummary
            cartItems={cartItems}
            onRemoveItem={removeFromCart}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            amountPaid={amountPaid}
            onAmountPaidChange={setAmountPaid}
            onFinishTransaction={handleFinishTransaction}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        </div>
      </div>

      <NewOrderModals
        showCategoryModal={showCategoryModal}
        onCloseCategoryModal={() => setShowCategoryModal(false)}
        categories={serviceCategories}
        onCategorySelect={handleCategorySelect}
        selectedCategory={selectedCategory}
        itemOptions={
          selectedCategory ? services.filter((s) => s.categoryId === selectedCategory.id) : []
        }
        onServiceConfirm={handleServiceConfirm}
        onServiceCancel={() => setSelectedCategory(null)}
        showSuppliesModal={showSuppliesModal}
        supplies={supplies}
        onSupplyAdd={handleSupplyAdd}
        onCloseSuppliesModal={() => setShowSuppliesModal(false)}
      />
    </div>
  );
}
