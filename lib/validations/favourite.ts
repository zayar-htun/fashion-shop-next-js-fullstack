import { z } from "zod";

export const toggleFavouriteSchema = z.object({
  productId: z.string().min(7),
});

export type ToggleFavouriteInput = z.infer<typeof toggleFavouriteSchema>;
