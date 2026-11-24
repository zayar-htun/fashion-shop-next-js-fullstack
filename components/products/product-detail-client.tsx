"use client";

import { useSession } from "@/lib/auth-client";
import { productDetailItem } from "@/lib/product-types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useTransition } from "react";
import { Badge } from "../ui/badge";
import { formatPrice, getCategoryLabel } from "@/lib/product-utils";
import FavouriteButton from "./favourite-button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { toast } from "../ui/toast";

type ProductDetailCLientProps = {
  product: productDetailItem;
};

function ProductDetailClient({ product }: ProductDetailCLientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [selectedSize, setSelectedSize] = useState<string | null>("");
  const [selectedColor, setSelectedColor] = useState<string | null>("");
  const [error, setError] = useState<string | null>(null);

  const sizes = useMemo(
    () => [...new Set(product.productVariants.map((item) => item.size))],
    [product.productVariants],
  );

  const colors = useMemo(() => {
    if (!selectedSize)
      return [...new Set(product.productVariants.map((item) => item.color))];

    return [
      ...new Set(
        product.productVariants
          .filter((variant) => variant.size === selectedSize)
          .map((item) => item.color),
      ),
    ];
  }, [product.productVariants, selectedSize]);

  const selectedVariant = useMemo(() => {
    if (!selectedSize || !selectedColor) return null;
    return product.productVariants.find(
      (variant) =>
        variant.size === selectedSize &&
        variant.color === selectedColor &&
        variant.stock > 0,
    );
  }, [product.productVariants, selectedSize, selectedColor]);

  const displayImage = selectedVariant?.imageUrl ?? product.imageUrl;

  function handleAddToCart() {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!selectedVariant) {
      setError("Please select valid size and color.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const result = await addToCartAction({
          variantId: selectedVariant.id,
          quantity: 1,
        });
        if (result.success) {
          showToast();
        } else if (result.error === "User not authenticated") {
          router.push("/login");
        } else setError(result.error || "Unable to add to cart.");
      } catch {
        setError("Unable to add to cart. Please try again.");
      }
    });
  }

  function showToast() {
    const id = toast.add({
      title: "Added to cart",
      description: `You successfully added ${product.name} to cart`,
      actionProps: {
        children: "View Cart",
        onClick() {
          toast.close(id);
          router.push("/cart");
        },
      },
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="bg-muted relative aspect-3/4 w-full overflow-hidden rounded-xl">
        <Image
          src={displayImage}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width:1024px) 100vw, 50vw"
          priority
        />
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary">
              {getCategoryLabel(product.category)}
            </Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-2xl font-semibold">
              {formatPrice(product.price)}
            </p>
          </div>
          <FavouriteButton productId={product.id} />
        </div>
        {product?.description && (
          <p className="text-muted-foreground">{product?.description}</p>
        )}

        <div>
          <FieldGroup>
            <Field className="w-full max-w-xs">
              <FieldLabel>Size</FieldLabel>
              <Select
                value={selectedSize}
                onValueChange={(size) => {
                  setSelectedSize(size);
                  setSelectedColor("");
                  setError(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sizes.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field className="w-full max-w-xs">
              <FieldLabel>Color</FieldLabel>
              <Select value={selectedColor} onValueChange={setSelectedColor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {colors.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            {selectedVariant && (
              <FieldDescription>
                In Stock: {selectedVariant.stock}
              </FieldDescription>
            )}
            {error && (
              <FieldError className="text-destructive">{error}</FieldError>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={!selectedVariant || isPending}
                onClick={handleAddToCart}
                className="flex-1"
              >
                {isPending ? "Adding . . ." : "Add to Cart"}
              </Button>
              <Button variant="outline" render={<Link href="/cart" />}>
                View Cart
              </Button>
            </div>
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailClient;
