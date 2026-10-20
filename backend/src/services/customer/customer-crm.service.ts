import { CustomerRepository } from "../../repositories/customer.repository.js";
import { CustomerCrmRepository, CustomerFilter, CustomerSort } from "../../repositories/customer-crm.repository.js";
import { OrderStatus, PaymentStatus } from "../../../generated/prisma/client.js";

const customerRepository = new CustomerRepository();
const crmRepository = new CustomerCrmRepository();

const toCents = (n: number) => Math.round(n * 100);

// Admin Customers page: every customer with their totals, searchable by
// name (any name used on their orders) or phone, sortable, paged.
export async function listCustomerSummariesService(params: {
  search?: string;
  sort: CustomerSort;
  filter?: CustomerFilter;
  page: number;
  pageSize: number;
}) {
  try {
    const [{ rows, total }, overview] = await Promise.all([
      crmRepository.findSummaries(params),
      crmRepository.getOverview(),
    ]);
    return {
      code: 200,
      status: "success",
      message: "Customers retrieved successfully",
      data: {
        customers: rows,
        overview,
        pagination: {
          page: params.page,
          pageSize: params.pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
        },
      },
    };
  } catch (error) {
    console.error("listCustomerSummariesService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve customers" };
  }
}

// Admin customer profile: details, totals and every order.
export async function getCustomerProfileService(id: string) {
  try {
    const customer = await customerRepository.findById(id);
    if (!customer) return { code: 404, status: "error", message: "Customer not found" };

    const orders = await crmRepository.findOrders(id);
    let visits = 0;
    let paidOrders = 0;
    let paidCents = 0;
    let refundedCents = 0;
    let cancelled = 0;
    const history = orders.map((o) => {
      const refunded = o.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
      if (o.status === OrderStatus.CANCELLED) {
        cancelled++;
      } else {
        visits++;
        if (o.paymentStatus === PaymentStatus.PAID) {
          paidOrders++;
          paidCents += toCents(Number(o.totalAmount));
        }
        refundedCents += toCents(refunded);
      }
      return {
        id: o.id,
        customerName: o.customerName,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        totalAmount: Number(o.totalAmount),
        refunded,
        isSelfService: o.isSelfService,
        createdAt: o.createdAt,
        staffName: o.user.name,
      };
    });
    // Oldest non-cancelled visit, if any.
    const visited = orders.filter((o) => o.status !== OrderStatus.CANCELLED);

    return {
      code: 200,
      status: "success",
      message: "Customer profile retrieved successfully",
      data: {
        customer: {
          id: customer.id,
          name: orders[0]?.customerName ?? customer.customerName,
          phoneNumber: customer.phoneNumber,
          createdAt: customer.createdAt,
        },
        stats: {
          visits,
          cancelled,
          spent: (paidCents - refundedCents) / 100,
          refunded: refundedCents / 100,
          // Per PAID order (an unpaid one hasn't been paid yet), after
          // refunds — the same basis as Total spent next to it.
          averageOrder: paidOrders > 0 ? Math.round((paidCents - refundedCents) / paidOrders) / 100 : 0,
          firstVisit: visited.length ? visited[visited.length - 1].createdAt : null,
          lastVisit: visited.length ? visited[0].createdAt : null,
        },
        // Every name this customer was served under (option C keeps the name
        // typed on each order), newest first.
        namesUsed: [...new Set(orders.map((o) => o.customerName))],
        orders: history,
      },
    };
  } catch (error) {
    console.error("getCustomerProfileService error", error);
    return { code: 500, status: "error", message: "Unable to retrieve customer profile" };
  }
}
