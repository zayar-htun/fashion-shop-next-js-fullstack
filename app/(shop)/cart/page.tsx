import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import CartItemControls from "@/components/products/cart-item-controls";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCartItems } from "@/lib/data/cart";
import { getSession } from "@/lib/session";
import { formatPrice } from "@/lib/product-utils";

export default async function CartPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cartItems = await getCartItems(session.user.id);
  const subtotal =
    cartItems.reduce(
      (total, item) => total + Math.round(item.price * 100) * item.quantity,
      0,
    ) / 100;

  if (!cartItems.length) {
    return (
      <main className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button render={<Link href="/" />}>Continue Shopping</Button>
      </main>
    );
  }
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(300px,1fr)]">
        <section aria-label="Cart items">
          <ul className="flex flex-col gap-4">
            {cartItems.map((item) => (
              <li key={item.id}>
                <Card className="min-h-40 justify-center py-6">
                  <div className="flex items-start gap-4 px-4 sm:px-5">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={96}
                      height={96}
                      unoptimized
                      className="bg-muted size-20 shrink-0 rounded-lg object-cover sm:size-24"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <CardHeader className="gap-1.5 px-0">
                        <CardTitle>
                          <h2>{item.name}</h2>
                        </CardTitle>
                        <CardDescription>
                          Size: {item.size} · Color: {item.color}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="flex flex-col gap-2 px-0">
                        <p className="font-semibold tabular-nums">
                          {formatPrice(item.price)}
                        </p>
                        {(!item.isActive || item.stock < item.quantity) && (
                          <p className="text-destructive text-sm">
                            {!item.isActive
                              ? "This product is no longer available."
                              : item.stock === 0
                                ? "This variant is out of stock."
                                : `Only ${item.stock} available. Please update your quantity.`}
                          </p>
                        )}
                        <CartItemControls
                          variantId={item.id}
                          name={item.name}
                          quantity={item.quantity}
                          stock={item.stock}
                          isActive={item.isActive}
                        />
                      </CardContent>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="order-summary-heading">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 id="order-summary-heading">Order Summary</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Payment</dt>
                  <dd>Cash on Delivery</dd>
                </div>
              </dl>
              <Separator />
              <dl>
                <div className="flex items-center justify-between gap-4 font-semibold">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter>
              <Button type="button" className="w-full">
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>
    </main>
  );
}
