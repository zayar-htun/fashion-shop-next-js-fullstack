import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function ForgotPasswordPageContent() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return <ForgotPasswordForm />;
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordForm />}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
