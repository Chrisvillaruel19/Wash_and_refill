import { z } from "zod";
import { packageDetailSchema } from "./package-detail.schema.js";

export const createPackageSchema = z.object({
  body: z.object({
    packageName: z
      .string({ message: "Package name is required" })
      .min(1, "Package name is required"),

    price: z
      .number({ message: "Price is required" })
      .nonnegative("Price cannot be negative"),

    color: z.string().min(1, "Color cannot be empty").optional(),

    details: z.array(packageDetailSchema).default([]),
  }),
});
