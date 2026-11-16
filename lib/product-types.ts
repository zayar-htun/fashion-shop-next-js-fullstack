import { CategoryValue } from "./product-utils";

export type ProductVariantListItem = {
  id: string;
  size: string;
  color: string;
  stock: number;
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  category: CategoryValue;
  imageUrl: string;
  productVariants: ProductVariantListItem[];
};

export type ProductsPageResults = {
  items: ProductListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type productDetailItem = Omit<ProductListItem, "productVariants"> & {
  description: string | null;
  productVariants: (ProductVariantListItem & {
    imageUrl: string | null;
  })[];
};
