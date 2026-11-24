import { db } from "../prisma";

export async function getCartItems(userId: string) {
  const cartItems = await db.orm.public.CartItem.where({ userId })
    .include("variant", (variant) =>
      variant
        .select("id", "size", "color", "imageUrl", "stock")
        .include("product", (product) =>
          product.select("name", "price", "imageUrl", "isActive"),
        ),
    )
    .orderBy((item) => item.createdAt.desc())
    .all();

  return cartItems.map((item) => ({
    id: item.variantId,
    name: item.variant.product.name,
    size: item.variant.size,
    color: item.variant.color,
    price: Number(item.variant.product.price),
    quantity: item.quantity,
    image: item.variant.imageUrl || item.variant.product.imageUrl,
    stock: item.variant.stock,
    isActive: item.variant.product.isActive,
  }));
}
