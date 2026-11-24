"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { updateCartQuantityAction } from "@/app/actions/cart";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";

type CartItemControlsProps = {
  variantId: string;
  name: string;
  quantity: number;
  stock: number;
  isActive: boolean;
};

export default function CartItemControls({
  variantId,
  name,
  quantity,
  stock,
  isActive,
}: CartItemControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleQuantityChange(nextQuantity: number) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateCartQuantityAction({
          variantId,
          quantity: nextQuantity,
        });
        if (result.success) router.refresh();
        else if (result.error === "User not authenticated")
          router.push("/login");
        else setError(result.error || "Unable to update your cart.");
      } catch {
        setError("Unable to update your cart. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label={`Quantity and removal controls for ${name}`}
        className="flex items-center gap-2"
        aria-busy={isPending}
      >
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={isPending || quantity <= 1}
          onClick={() => handleQuantityChange(quantity - 1)}
          aria-label={`Decrease quantity of ${name}`}
        >
          <MinusIcon />
        </Button>
        <span
          className="min-w-6 text-center text-sm tabular-nums"
          aria-label={`Quantity: ${quantity}`}
        >
          {quantity}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          disabled={isPending || !isActive || quantity >= stock}
          onClick={() => handleQuantityChange(quantity + 1)}
          aria-label={`Increase quantity of ${name}`}
        >
          <PlusIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={isPending}
          onClick={() => handleQuantityChange(0)}
          aria-label={`Remove ${name} from cart`}
        >
          <Trash2Icon />
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
