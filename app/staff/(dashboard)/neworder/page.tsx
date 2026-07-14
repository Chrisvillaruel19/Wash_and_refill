"use client";

import { useState } from "react";
import CustomerInfoForm from "../../../components/staffcom/neworder/CustomerInfoForm";
import PackageGrid from "../../../components/staffcom/neworder/PackageGrid";
import OrderSummary from "../../../components/staffcom/neworder/OrderSummary";
import NewOrderModals from "../../../components/staffcom/neworder/NewOrderModals";
import { ServiceCategory, CartItem, PaymentMethod } from "./types";
import { Order } from "../types";
import { packages, supplies, serviceCategories, serviceItemsByCategory } from "./data";
import { addStoredOrder } from "../localOrders";

export default function NewOrderPage() {
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [amountPaid, setAmountPaid] = useState(0);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  function addToCart(item: CartItem) {
    setCartItems((prev) => [...prev, item]);
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
    if (cartItems.length === 0) return;

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const now = new Date();

    const newOrder: Order = {
      id: `${Date.now()}`,
      customer: customerName || "Walk-in Customer",
      contact: phoneNumber || "N/A",
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      date: now.toLocaleDateString(),
      amount: total,
      payStatus: amountPaid >= total ? "Paid" : "UnPaid",
      status: "Pending",
      items: cartItems.map((item) => item.name),
      staffName: "Eleno",
    };

    addStoredOrder(newOrder);

    alert("Transaction completed! Check your dashboard.");
    setCartItems([]);
    setCustomerName("");
    setPhoneNumber("");
    setAmountPaid(0);
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">New Order</h1>

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
              className="border border-gray-300 rounded-xl p-4 flex flex-col items-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="font-semibold">Laundry Services</span>
            </button>
            <button
              onClick={() => setShowSuppliesModal(true)}
              className="border border-gray-300 rounded-xl p-4 flex flex-col items-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="font-semibold">Laundry Supplies</span>
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
          />
        </div>
      </div>

      <NewOrderModals
        showCategoryModal={showCategoryModal}
        onCloseCategoryModal={() => setShowCategoryModal(false)}
        categories={serviceCategories}
        onCategorySelect={handleCategorySelect}
        selectedCategory={selectedCategory}
        itemOptions={selectedCategory ? serviceItemsByCategory[selectedCategory.id] || [] : []}
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