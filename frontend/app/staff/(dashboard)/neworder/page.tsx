"use client";

import { useState, useEffect, useRef } from "react";
import { Shirt, LayoutGrid } from "lucide-react";
import CustomerInfoForm from "../../../components/staffcom/neworder/CustomerInfoForm";
import PackageGrid from "../../../components/staffcom/neworder/PackageGrid";
import OrderSummary from "../../../components/staffcom/neworder/OrderSummary";
import NewOrderModals from "../../../components/staffcom/neworder/NewOrderModals";
import { ServiceCategory, CartItem, PaymentMethod, Package, ServiceItem, SupplyItem } from "./types";
import { Order } from "../types";
import { serviceCategories } from "./data";
import { getStoredPackages } from "../../../lib/services/packages.service";
import { getStoredServices } from "../../../lib/services/services.service";
import { addStoredOrder } from "../../../lib/services/orders.service";
import { applyOrderStockImpact, getStoredInventory } from "../../../lib/services/inventory.service";
import { getCurrentUser } from "../../../lib/auth";

// Demo-mode fix: Laundry Supplies now reads live Admin-managed inventory
// instead of a hardcoded list, so new items Admin adds show up immediately.
// Two rows are both named "Liquid Detergent" (Sachet vs Liters) — this
// suffixes the unit only when a name collides, reproducing the exact same
// "Liquid Detergent (Sachet)" / "Liquid Detergent (Liters)" labels shown
// today, so nothing changes for the existing items.
function buildSupplyMenu(): SupplyItem[] {
  const inventory = getStoredInventory();
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
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // React state updates aren't guaranteed to re-render before a second click
  // event is dispatched, so the actual re-entrancy guard is this ref (set
  // synchronously, immediately) — isSubmitting state just drives the UI.
  const isSubmittingRef = useRef(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackages(getStoredPackages());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServices(getStoredServices());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupplies(buildSupplyMenu());
  }, []);

  function addToCart(newItem: CartItem) {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.name === newItem.name && item.price === newItem.price
      );
      if (existingIndex !== -1) {
        return prev.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + newItem.quantity } : item
        );
      }
      return [...prev, newItem];
    });
  }

  function addItemToCart(name: string, price: number, quantity = 1) {
    addToCart({ id: `${Date.now()}-${Math.random()}`, name, price, quantity });
  }

  function removeFromCart(id: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleCategorySelect(category: ServiceCategory) {
    setSelectedCategory(category);
    setShowCategoryModal(false);
  }

  function handleServiceConfirm(result: {
    itemName: string;
    quantityKg: number;
    serviceType: string;
    total: number;
  }) {
    addItemToCart(`${result.itemName} (${result.serviceType}, ${result.quantityKg}kg)`, result.total);
    setSelectedCategory(null);
  }

  function handleSupplyAdd(supply: { name: string; price: number }, quantity: number) {
    addItemToCart(supply.name, supply.price, quantity);
  }

  function handlePackageAdd(pkg: { name: string; price: number }) {
    addItemToCart(pkg.name, pkg.price);
  }

  function handleFinishTransaction() {
    if (cartItems.length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const now = new Date();

    const newOrder: Order = {
      id: `${Date.now()}`,
      customer: customerName || "Walk-in Customer",
      contact: phoneNumber || "N/A",
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString(),
      createdAt: now.toISOString(),
      amount: total,
      payStatus: amountPaid >= total ? "Paid" : "UnPaid",
      paymentMethod,
      status: "Pending",
      items: cartItems.map((item) =>
        item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name
      ),
      staffName: getCurrentUser()?.name || "Unknown",
    };

    addStoredOrder(newOrder);
    applyOrderStockImpact(newOrder.items || [], 1);

    alert("Transaction completed! Check your dashboard.");
    setCartItems([]);
    setCustomerName("");
    setPhoneNumber("");
    setAmountPaid(0);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
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