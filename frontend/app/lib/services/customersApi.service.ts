import { apiClient } from "../apiClient";

export type CustomerSort = "recent" | "visits" | "name";
// "regular" = 5+ visits (see REGULAR_MIN_VISITS on the Customers page).
export type CustomerFilter = "all" | "regular";

// One row of the Admin Customers page.
export interface CustomerSummary {
  id: string;
  // Name on their most recent order.
  name: string;
  phoneNumber: string | null;
  // Orders that weren't cancelled.
  visits: number;
  firstVisit: string | null;
  lastVisit: string | null;
}

// Headline numbers for the Customers page (all customers, not just the page).
export interface CustomerOverview {
  customers: number;
  // 5+ visits.
  regulars: number;
  // First visit this calendar month.
  newThisMonth: number;
}

export async function getCustomerSummaries(params: {
  search?: string;
  sort: CustomerSort;
  filter?: CustomerFilter;
  page: number;
  pageSize: number;
}): Promise<{ items: CustomerSummary[]; totalPages: number; total: number; overview: CustomerOverview }> {
  const qs = new URLSearchParams({
    sort: params.sort,
    filter: params.filter ?? "all",
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.search?.trim() ? { search: params.search.trim() } : {}),
  });
  const r = await apiClient.get<{
    customers: CustomerSummary[];
    overview: CustomerOverview;
    pagination: { totalPages: number; total: number };
  }>(`/customers/summaries?${qs}`);
  return {
    items: r.customers.map((c) => ({ ...c, visits: Number(c.visits) })),
    totalPages: r.pagination.totalPages,
    total: r.pagination.total,
    overview: {
      customers: Number(r.overview.customers),
      regulars: Number(r.overview.regulars),
      newThisMonth: Number(r.overview.newThisMonth),
    },
  };
}

export interface CustomerOrder {
  id: string;
  customerName: string;
  status: "PENDING" | "IN_PROGRESS" | "READY" | "CLAIMED" | "CANCELLED";
  paymentStatus: "PAID" | "UNPAID";
  paymentMethod: "CASH" | "GCASH" | null;
  totalAmount: number;
  refunded: number;
  isSelfService: boolean;
  createdAt: string;
  staffName: string;
}

export interface CustomerProfile {
  customer: { id: string; name: string; phoneNumber: string | null; createdAt: string };
  stats: {
    visits: number;
    cancelled: number;
    spent: number;
    refunded: number;
    averageOrder: number;
    firstVisit: string | null;
    lastVisit: string | null;
  };
  // Every name used on their orders, newest first.
  namesUsed: string[];
  orders: CustomerOrder[];
}

export async function getCustomerProfile(id: string): Promise<CustomerProfile> {
  const r = await apiClient.get<CustomerProfile>(`/customers/${id}/profile`);
  return {
    ...r,
    orders: r.orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount), refunded: Number(o.refunded) })),
  };
}

