import { cacheTag } from "next/cache";
import { CACHE_TAGS } from "../cache-tags";
import { cacheLife } from "next/cache";
import { db } from "../prisma";

export async function getFavouriteIds(userId: string) {
  "use cache";
  cacheTag(CACHE_TAGS.favourites(userId));
  cacheLife("minutes");

  const favourites = await db.orm.public.ProductToUser.select("a")
    .where({ b: userId })
    .all();

  return favourites.map((favourite) => favourite.a); // a is productId, b is userId
}
