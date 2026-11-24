"use client";

import Link from "next/link";
import { UserIcon } from "lucide-react";
import { Button } from "../ui/button";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type UserNavClientProps = {
  session: any;
};

const getInitials = (name?: string | null): string => {
  if (!name?.trim()) return "LU";

  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
};

function UserNavClient({ session }: UserNavClientProps) {
  console.log(session);

  if (!session) {
    return (
      <Button variant="ghost" size={"icon"}>
        <Link href="/login">
          <UserIcon />
        </Link>
      </Button>
    );
  }
  const router = useRouter();
  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleWishlist = async () => {
    if (!session) {
      router.push("/login");
    }
    router.push("/cart");
  };
  return (
    <div>
      {/* <Button
        variant="ghost"
        onClick={() => {
          handleSignOut();
        }}
      >
        {session.user.name || ""}
      </Button> */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Avatar>
              <AvatarFallback>
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
          }
        />
        <DropdownMenuContent className="w-40" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>

         

            <DropdownMenuItem onSelect={handleWishlist}>
              Wishlist
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onSelect={handleSignOut}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default UserNavClient;
