import { z } from "zod";

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid customer id"),
  }),
  body: z.object({
    customerName: z
      .string({ message: "Customer name is required" })
      .min(1, "Customer name is required"),
  }),
});
