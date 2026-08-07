import { z } from "zod";
import { packageDetailSchema } from "./package-detail.schema.js";
import { shortTextRule } from "../common/validation-rules.js";

export const createPackageSchema = z.object({
  body: z.object({
    packageName: shortTextRule("Package name"),

    price: z
      .number({ message: "Price is required" })
      .positive("Price must be greater than zero"),

    color: z.string().min(1, "Color cannot be empty").optional(),

    details: z.array(packageDetailSchema).default([]),
  }),
});
