import { z } from "zod";
import { ServiceType } from "../../../generated/prisma/client.js";

// Three independent line-item types, mirroring the frontend's three
// independent add-to-cart entry points (Package / Laundry Service /
// Laundry Supplies) verified against neworder/page.tsx — a Package line
// never implies or requires a Service line, and vice versa.
const packageItemSchema = z.object({
  type: z.literal("PACKAGE"),
  packageId: z.string().uuid("Invalid package id"),
  quantity: z
    .number({ message: "Quantity is required" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
});

const serviceItemSchema = z.object({
  type: z.literal("SERVICE"),
  serviceId: z.string().uuid("Invalid laundry service id"),
  weight: z
    .number({ message: "Weight is required" })
    .positive("Weight must be greater than zero"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero")
    .default(1),
  // Optional, not required — older/other callers omitting it just store
  // null, matching the column's nullable default.
  serviceType: z.enum(ServiceType, { message: "Invalid service type" }).optional(),
});

const inventoryItemSchema = z.object({
  type: z.literal("INVENTORY"),
  inventoryId: z.string().uuid("Invalid inventory id"),
  quantity: z
    .number({ message: "Quantity is required" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
});

export const orderItemSchema = z.discriminatedUnion("type", [
  packageItemSchema,
  serviceItemSchema,
  inventoryItemSchema,
]);

export type OrderItemInput = z.infer<typeof orderItemSchema>;
