import React from "react";
import UserNavClient from "./user-nav-client";
import { getSession } from "@/lib/session";

async function UserNav() {
  const session = await getSession();
  return <UserNavClient session={session} />;
}

export default UserNav;
