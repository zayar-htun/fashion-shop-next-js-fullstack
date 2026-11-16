import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.number().int().positive("Quantity must be a positive interger"),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
