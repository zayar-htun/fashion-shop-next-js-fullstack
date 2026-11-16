"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { HeartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavourite } from "../providers/favourite-provider";
import { toggleFavourite } from "@/app/actions/favourites";

function FavouriteButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const { isFavourite, setFavourite } = useFavourite();
  const favourite = isFavourite(productId);

  function handleFavourite() {
    if (!session) {
      router.push("/login");
      return;
    }

    const previouslyFavourited = favourite;
    const newFavouriteState = !previouslyFavourited;
    setFavourite(productId, newFavouriteState);

    startTransition(async () => {
      try {
        const res = await toggleFavourite({ productId });
        if (!res.success) {
          setFavourite(productId, previouslyFavourited);
          if (res.error == "User not authenticated") {
            router.push("/login");
            return;
          }
          return;
        }

        const confirmed = res?.data?.isFavourite ?? newFavouriteState;
        if (confirmed !== newFavouriteState) {
          setFavourite(productId, confirmed);
        }
        router.refresh();
      } catch (error) {
        setFavourite(productId, previouslyFavourited);
      }
    });
  }
  return (
    <Button
      variant="ghost"
      type="button"
      size="icon"
      className={cn("rounded-full", className)}
      aria-busy={isPending}
      aria-pressed={favourite}
      onClick={() => {
        handleFavourite();
      }}
    >
      <HeartIcon
        className={cn("h-4 w-4", favourite && "fill-red-500 text-red-500")}
      />
    </Button>
  );
}

export default FavouriteButton;
