"use client";

import Link from "next/link";
import { UserIcon } from "lucide-react";
import { Button } from "../ui/button";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type UserNavClientProps = {
  session: any;
};

function UserNavClient({ session }: UserNavClientProps) {
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
  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => {
          handleSignOut();
        }}
      >
        Logout
      </Button>
    </div>
  );
}

export default UserNavClient;
