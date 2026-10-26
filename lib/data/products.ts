import { cacheLife, cacheTag } from "next/cache";

import { CategoryValue } from "../product-utils";
import { CACHE_TAGS } from "../cache-tags";
import { queryProductPage } from "../queries/product-page";

export async function getProductPage(
  category: CategoryValue | undefined,
  cursor: string | undefined,
  limit: number = 12,
) {
  "use cache";
  cacheTag(CACHE_TAGS.products);
  cacheLife("hours");

  return queryProductPage(category, cursor, limit);
}
