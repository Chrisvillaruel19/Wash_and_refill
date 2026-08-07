import { apiClient } from "../apiClient";

export interface Customer {
  id: string;
  customerName: string;
  phoneNumber: string;
  createdAt: string;
}

type BackendCustomer = {
  id: string;
  customerName: string;
  phoneNumber: string;
  createdAt: string;
};

export async function getCustomers(): Promise<Customer[]> {
  const { customers } = await apiClient.get<{ customers: BackendCustomer[] }>("/customers");
  return customers;
}

// Only customerName is editable — phoneNumber is the unique lookup key
// Order creation's find-or-create relies on, never changed after the fact.
export async function updateCustomerName(id: string, customerName: string): Promise<Customer> {
  const { customer } = await apiClient.patch<{ customer: BackendCustomer }>(`/customers/${id}`, {
    customerName,
  });
  return customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}
