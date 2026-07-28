import { auth } from "./auth";
import { headers } from "next/headers";

export async function getSession() {
  const session = auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return null;
  }

  // add logic for role and permission in session
  return session;
}
