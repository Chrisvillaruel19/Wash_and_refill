import { z } from "zod";
import { packageDetailSchema } from "./package-detail.schema.js";
import { shortTextRule } from "../common/validation-rules.js";

export const updatePackageSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid package id"),
  }),
  body: z
    .object({
      packageName: shortTextRule("Package name").optional(),
      price: z.number().positive("Price must be greater than zero").optional(),
      color: z.string().min(1, "Color cannot be empty").optional(),
      // Omitted entirely = leave existing recipe untouched. Present (even as
      // an empty array) = replace the recipe with exactly this list.
      details: z.array(packageDetailSchema).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided to update",
    }),
});
