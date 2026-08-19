"use client";

import Link from "next/link";
import { UserIcon } from "lucide-react";
import { Button } from "../ui/button";

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
  return <div>User</div>;
}

export default UserNavClient;
