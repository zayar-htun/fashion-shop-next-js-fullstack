import SignUpForm from "@/components/auth/signup-from";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function RegisterPageContent() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return <SignUpForm />;
}

export default function Register() {
  return (
    <Suspense fallback={<SignUpForm />}>
      <RegisterPageContent />
    </Suspense>
  );
}
