"use client";

import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { ProductListItem } from "@/lib/product-types";
import { getCategoryLabel, formatPrice } from "../../lib/product-utils";
import FavouriteButton from "./favourite-button";

type ProductCardClientProps = {
  product: ProductListItem;
  priority?: boolean;
};

function ProductCardClient({
  product,
  priority = false,
}: ProductCardClientProps) {
  const sizes = [...new Set(product.productVariants.map((v) => v.size))];
  const colors = [...new Set(product.productVariants.map((v) => v.color))];
  return (
    <Card className="overflow-hidden pt-0">
      <CardHeader className="relative p-0">
        <Link href={`/products/${product.slug}`}>
          <div className="bg-muted relative aspect-3/4 overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority={priority}
              className="object-cover transition-transform hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        </Link>
        <FavouriteButton
          productId={product.id}
          className="bg-background/80 absolute top-2 right-2 backdrop-blur-sm"
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/product/${product.slug}`}
            className="font-medium hover:underline"
          >
            {product.name}
          </Link>
          <Badge variant="secondary">
            {getCategoryLabel(product.category)}
          </Badge>
        </div>
        <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-1 px-4 pb-4">
        {sizes?.map((size) => (
          <Badge variant="outline" key={size}>
            {size}
          </Badge>
        ))}
        {colors?.map((color) => (
          <Badge variant="outline" key={color}>
            {color}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}

export default ProductCardClient;
