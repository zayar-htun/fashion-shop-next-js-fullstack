import { z } from "zod";

export const productsPageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  category: z.enum(["MEN", "WOMEN", "TEENS", "KIDS", "CHILD"]).optional(),
});

export type ProductsPageInput = z.infer<typeof productsPageQuerySchema>;
