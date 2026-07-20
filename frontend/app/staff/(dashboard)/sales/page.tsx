"use client";

import { useEffect, useState } from "react";
import SalesStats from "../../../components/staffcom/sales/SalesStats";
import SalesFilters, { SalesFilter } from "../../../components/staffcom/sales/SalesFilters";
import SalesTable from "../../../components/staffcom/sales/SalesTable";
import { getStoredOrders } from "../localOrders";
import { Order } from "../types";

export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<SalesFilter>("All");
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrders(getStoredOrders());
  }, []);

  const totalPending = orders.filter((o) => o.status === "Pending").length;
  const totalInProgress = orders.filter((o) => o.status === "In progress").length;
  const totalClaimed = orders.filter((o) => o.status === "Claimed").length;

  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      activeFilter === "All" ||
      (activeFilter === "Claimed" && order.status === "Claimed") ||
      (activeFilter === "Unclaimed" && order.status !== "Claimed");

    const matchesDate = order.date.includes(searchDate);

    return matchesFilter && matchesDate;
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Sales</h1>

      <SalesStats
        totalPending={totalPending}
        totalInProgress={totalInProgress}
        totalClaimed={totalClaimed}
      />
      <SalesFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchDate={searchDate}
        onSearchDateChange={setSearchDate}
      />
      <SalesTable orders={filteredOrders} />
    </div>
  );
}