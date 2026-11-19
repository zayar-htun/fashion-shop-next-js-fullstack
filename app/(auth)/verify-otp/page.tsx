import AuthFormPanel from "@/components/auth/auth-form-panel";
import VerifyOtpForm from "@/components/auth/verify-otp-form";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function VerifyOtpPageContent() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  return <VerifyOtpForm />;
}

export default function VerifyOtp() {
  return (
    <Suspense
      fallback={
        <AuthFormPanel
          title="Verify OTP"
          description="Loading your verification details."
        >
          <p role="status" className="text-muted-foreground text-sm">
            Loading verification form...
          </p>
        </AuthFormPanel>
      }
    >
      <VerifyOtpPageContent />
    </Suspense>
  );
}
