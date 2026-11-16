"use client";

import { CategoryValue } from "@/lib/product-utils";
import ProductCardClient from "./product-card-client";
import { ProductListItem, ProductsPageResults } from "@/lib/product-types";
import { preload } from "swr";
import useSWRInfinite from "swr/infinite";
import { useCallback, useEffect, useRef } from "react";
import { productPageFetcher } from "@/lib/api/load-more-products";
import { Skeleton } from "../ui/skeleton";

type ProductInfiniteListProps = {
  category?: CategoryValue;
  initialItems: ProductListItem[];
  initialHasMore: boolean;
  initialNextCursor: string | null;
};

function buildProductsUrl(category: CategoryValue | undefined, cursor: string) {
  // let url = `/api/products?limit=20`;
  // if (category) {
  //   url += `&category=${category}`;
  // }
  // if (cursor) {
  //   url += `&cursor=${cursor}`;
  // }
  // return url;
  const params = new URLSearchParams({ cursor, limit: "12" });

  if (category) {
    params.set("category", category);
  }

  return `/api/products?${params.toString()}`;
}

function ProductInfiniteList({
  category,
  initialItems,
  initialHasMore,
  initialNextCursor,
}: ProductInfiniteListProps) {
  const setinelRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ProductsPageResults | null) => {
      if (previousPageData && !previousPageData.hasMore) return null;

      const cursor =
        pageIndex === 0
          ? initialNextCursor
          : (previousPageData?.nextCursor ?? null);

      if (!cursor) return null;

      return buildProductsUrl(category, cursor);
    },
    [category, initialNextCursor],
  );
  const {
    data: extraPages,
    error,
    size,
    setSize,
  } = useSWRInfinite(getKey, productPageFetcher, {
    initialSize: 0,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  const loadedExtraItems = extraPages?.flatMap((page) => page.items) ?? [];

  const items = [...initialItems, ...loadedExtraItems];

  const lastExtraPage = extraPages?.at(-1); // latest page of extra pages, if any

  const hasMore = extraPages?.length
    ? (lastExtraPage?.hasMore ?? false)
    : initialHasMore;

  const isLoadingMore = hasMore && size > (extraPages?.length ?? 0);

  useEffect(() => {
    if (!initialHasMore || !initialNextCursor) return;
    const nextUrl = buildProductsUrl(category, initialNextCursor);
    preload(nextUrl, productPageFetcher);
  }, [category, initialHasMore, initialNextCursor]);

  useEffect(() => {
    const nextCursor = lastExtraPage?.nextCursor;
    if (!nextCursor || !lastExtraPage.hasMore) return;
    const nextUrl = buildProductsUrl(category, nextCursor);
    preload(nextUrl, productPageFetcher);
  }, [category, lastExtraPage]);

  useEffect(() => {
    if (!isLoadingMore) {
      isLoadingRef.current = false; // Reset the loading state when not loading more
    }
    // isLoadingRef.current = isLoadingMore;
  }, [isLoadingMore]);

  useEffect(() => {
    if (!setinelRef.current || !hasMore || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current) {
          // Load more items when the sentinel is visible
          isLoadingRef.current = true; // Set the loading state to true to prevent multiple triggers
          setSize((prevSize) => prevSize + 1);
        }
      },
      { rootMargin: "500px" },
    );
    observer.observe(setinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, error, setSize]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg">No Products Found</p>
        <p className="text-muted-foreground text-sm">
          Try select on different category
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items?.map((product, index) => (
          <ProductCardClient
            key={product?.id}
            product={product}
            priority={index < 4}
          />
        ))}
      </div>
      {
        isLoadingMore && (
          <>
          {
          Array.from({length:4}).map((_, index) => (
            <Skeleton key={index} className="aspect-3/4 w-full animate-pulse rounded-xl bg-muted" />
          ))
          }
          </>
        )
      }
      {error && (
        <div className="w-full text-red-500">
          Error loading more products: {error.message || "Error occurred"}
        </div>
      )}
      {hasMore && !error && (
        <div ref={setinelRef} className="h-px w-full shrink-0" aria-hidden />
      )}
    </div>
  );
}

export default ProductInfiniteList;
