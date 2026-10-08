import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/login-form";
import React, { Suspense } from "react";

async function LoginPageContent() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return <LoginForm />;
}
function Login() {
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginPageContent />
    </Suspense>
  );
}

export default Login;
