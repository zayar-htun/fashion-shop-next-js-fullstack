import { z } from "zod";

export const addToCartSchema = z.object({
  variantId: z.string().min(1, "Variant ID is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});

export const updateCartQuantitySchema = addToCartSchema.extend({
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
