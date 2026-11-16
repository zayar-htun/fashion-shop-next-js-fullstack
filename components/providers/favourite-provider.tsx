"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type FavouriteProviderProps = {
  favouriteIds: Set<string>; // avoid id duplication, use Set for O(1) lookup
  isFavourite: (productId: string) => boolean;
  setFavourite: (productId: string, isFavourite: boolean) => void;
};

const FavouriteContext = createContext<FavouriteProviderProps | null>(null);

export function useFavourite() {
  const context = useContext(FavouriteContext);

  if (!context) {
    throw new Error("useFavourite must be used within a FavouriteProvider");
  }

  return context;
}

function FavouriteProvider({
  initialFavouriteIds,
  children,
}: {
  initialFavouriteIds: string[];
  children: React.ReactNode;
}) {
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(
    new Set(initialFavouriteIds),
  );

  const isFavourite = useCallback(
    (productId: string) => {
      return favouriteIds.has(productId);
    },
    [favouriteIds],
  );

  const setFavourite = useCallback(
    (productId: string, isFavourite: boolean) => {
      setFavouriteIds((prev) => {
        const newSet = new Set(prev);
        if (isFavourite) {
          newSet.add(productId);
        } else {
          newSet.delete(productId);
        }
        return newSet;
      });
    },
    [favouriteIds]
  );

  const value = useMemo(
    () => ({ favouriteIds, isFavourite, setFavourite }),
    [favouriteIds, isFavourite, setFavourite],
  );

  return (
    <FavouriteContext.Provider
      value={value}
    >
      {children}
    </FavouriteContext.Provider>
  );
}

export default FavouriteProvider;
