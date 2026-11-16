import { getProductPage } from "@/lib/data/products";
import { CategoryValue } from "@/lib/product-utils";
import ProductInfiniteList from "./product-infinite-list";

type ProductGridProps = {
  category?: CategoryValue;
};

async function ProductGrid({ category }: ProductGridProps) {
  // fetch products serverside
  const page = await getProductPage(category, undefined, 12);
  return (
    <ProductInfiniteList
      key={category ?? "ALL"}
      category={category}
      initialItems={page?.items}
      initialNextCursor={page?.nextCursor}
      initialHasMore={page?.hasMore}
    />
  );
}

export default ProductGrid;
