import { CategoryValue } from "@/lib/product-utils";
import React from "react";

type ProductGridProps = {
  category?: CategoryValue;
};

async function ProductGrid({ category }: ProductGridProps) {
  // fetch products serverside
  // const page = await getProductPage(category,underfined,12)
  return <div>ProductGrid via server + client product</div>;
}

export default ProductGrid;
