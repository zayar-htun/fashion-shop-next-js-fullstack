"use server";

import z from "zod";
import { getSession } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { addToCartSchema } from "@/lib/validations/cart";
import { db } from "@/lib/prisma";

export async function addToCartAction(input: unknown) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "User not authenticated" };
  }

  const parsed = addToCartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { variantId, quantity } = parsed.data;

  try {
    await db.transaction(async (tx) => {
      // first check (variant)
      const variant = await tx.orm.public.ProductVariant.where({
        id: variantId,
      })
        .include("product", (p) => p.select("isActive"))
        .first();

      if (!variant || !variant.product.isActive) {
        return { success: false, error: "Product variant not found" };
      }

      const existingCartItem = await tx.orm.public.CartItem.where({
        userId: session.user.id,
        variantId,
      }).first();

      const totalQuantity = existingCartItem
        ? existingCartItem.quantity + quantity
        : quantity;

      if (Number(variant.stock) < totalQuantity) {
        return { success: false, error: "Not enough stock " };
      }

      if (existingCartItem) {
        await tx.orm.public.CartItem.where({
          userId: session.user.id,
          variantId,
        }).update({ quantity: totalQuantity });
      } else {
        await tx.orm.public.CartItem.create({
          userId: session.user.id,
          variantId,
          quantity,
        });
      }

      await tx.orm.public.CartItem.create({
        userId: session.user.id,
        variantId,
      });
    });
  } catch (error) {
    console.log("Error");
  }
}
