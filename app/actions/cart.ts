"use server";

import z from "zod";
import { getSession } from "@/lib/session";
import {
  addToCartSchema,
  updateCartQuantitySchema,
} from "@/lib/validations/cart";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addToCartAction(input: unknown) {
  return changeCartQuantity(input, false);
}

export async function updateCartQuantityAction(input: unknown) {
  return changeCartQuantity(input, true);
}

async function changeCartQuantity(input: unknown, replaceQuantity: boolean) {
  const session = await getSession();
  if (!session) {
    return { success: false, error: "User not authenticated" };
  }

  const parsed = (
    replaceQuantity ? updateCartQuantitySchema : addToCartSchema
  ).safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please select a variant and a valid quantity.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { variantId, quantity } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      // Serialize additions for this variant, including when no cart row exists yet.
      // Lock the product too so it cannot be deactivated during validation.
      await tx
        .query(
          db.raw.sql`
          SELECT v.id
          FROM public.product_variant v
          JOIN public.product p ON p.id = v."productId"
          WHERE v.id = ${variantId}
          FOR UPDATE OF v
          FOR SHARE OF p
        `
            .returnsRow({ id: "pg/text@1" })
            .build(),
        )
        .toArray();

      if (replaceQuantity && quantity === 0) {
        await tx.orm.public.CartItem.where({
          userId: session.user.id,
          variantId,
        }).delete();
        return { success: true, data: { variantId, quantity: 0 } };
      }

      const variant = await tx.orm.public.ProductVariant.where({
        id: variantId,
      })
        .include("product", (p) => p.select("isActive"))
        .first();

      if (!variant || !variant.product.isActive) {
        return {
          success: false,
          error: "This product is no longer available.",
        };
      }

      if (variant.stock <= 0) {
        return { success: false, error: "This variant is out of stock." };
      }

      const existingCartItem = await tx.orm.public.CartItem.where({
        userId: session.user.id,
        variantId,
      }).first();

      const totalQuantity =
        existingCartItem && !replaceQuantity
          ? existingCartItem.quantity + quantity
          : quantity;

      if (Number(variant.stock) < totalQuantity) {
        return {
          success: false,
          error: `Only ${variant.stock} available. Your cart already contains ${existingCartItem?.quantity ?? 0}.`,
        };
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

      // Cart quantities do not reserve or reduce inventory.
      return { success: true, data: { variantId, quantity: totalQuantity } };
    });

    if (result.success) revalidatePath("/cart");
    return result;
  } catch (error) {
    console.error("Error adding to cart:", error);
    return {
      success: false,
      error: "Unable to add to cart. Please try again.",
    };
  }
}
