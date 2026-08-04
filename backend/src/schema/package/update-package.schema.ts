import { z } from "zod";
import { packageDetailSchema } from "./package-detail.schema.js";

export const updatePackageSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid package id"),
  }),
  body: z
    .object({
      packageName: z.string().min(1, "Package name is required").optional(),
      price: z.number().nonnegative("Price cannot be negative").optional(),
      color: z.string().min(1, "Color cannot be empty").optional(),
      // Omitted entirely = leave existing recipe untouched. Present (even as
      // an empty array) = replace the recipe with exactly this list.
      details: z.array(packageDetailSchema).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
