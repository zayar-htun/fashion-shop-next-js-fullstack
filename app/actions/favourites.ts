"use server";

import { db } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toggleFavouriteSchema } from "@/lib/validations/favourite";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { revalidateUserFavourites } from "@/lib/cache-tags";

export async function toggleFavourite(input: unknown) {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "User not authenticated",
    };
  }

  const parsed = toggleFavouriteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      message: "Invalid product ID",
    };
  }

  const { productId } = parsed.data;

  try {
    const existingFavourite = await db.orm.public.ProductToUser.where({
      a: productId,
      b: session.user.id,
    }).first();

    if (existingFavourite) {
      await db.orm.public.ProductToUser.where({
        a: productId,
        b: session.user.id,
      }).delete();
      revalidateUserFavourites(session.user.id, true);
      revalidatePath("/", "layout");
      revalidatePath(`/products`, "layout");
      return {
        success: true,
        data: {
          productId,
          isFavourite: false,
        },
      };
    } else {
      await db.orm.public.ProductToUser.create({
        a: productId,
        b: session.user.id,
      });
      revalidateUserFavourites(session.user.id, true);
      revalidatePath("/", "layout");
      revalidatePath(`/products`, "layout");
      return {
        success: true,
        data: {
          productId,
          isFavourite: true,
        },
      };
    }
  } catch (error) {
    console.error("Error checking existing favourite:", error);
    return {
      success: false,
      message: "Error checking existing favourite",
    };
  }
}
