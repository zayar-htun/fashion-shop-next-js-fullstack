import { ProductsPageResults } from "../product-types";
import { ActionResponse } from "../types";
import { authFetch } from "./auth-fetch";

export async function productPageFetcher(
  url: string,
): Promise<ProductsPageResults> {
  const res = await authFetch(url);
  const body = (await res.json()) as ActionResponse<ProductsPageResults>;
  if (!res.ok || !body?.data || !body.success) {
    throw new Error(body.error || `Failed to fetch products `);
  }

  return body.data;
}
