"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { useTransition } from "react";
import { OtpInput, otpSchema } from "@/lib/validations/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { sanitizeCallbackUrl } from "@/lib/auth/safe-redirect";
import AuthFormPanel from "./auth-form-panel";
import { Button } from "../ui/button";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const flow = searchParams.get("flow") ?? "";
  const resumed = searchParams.get("resumed") === "true";
  const callBackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const [isPending, startTransition] = useTransition();
  const form = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
      email,
    },
  });

  function onSubmit(data: OtpInput) {
    startTransition(async () => {
      if (flow === "login") {
        // Handle login flow
      } else if (flow === "register") {
        // Handle register flow
      }
      return;
    });
  }

  function onResendOtp() {
    startTransition(async () => {
      return;
    });
  }

  return (
    <AuthFormPanel
      title="Verify OTP"
      description={`Please enter the OTP sent to : ${email}.`}
    >
      <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Controller
            name="otp"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="otp">Verify OTP</FieldLabel>
                <FieldDescription>
                  OTP expires in 5 minutes. Please check your email for the OTP.
                </FieldDescription>
                <InputOTP
                  maxLength={6}
                  value={field.value}
                  onChange={field.onChange}
                  pattern={REGEXP_ONLY_DIGITS}
                  containerClassName="justify-center sm:justify-start gap-2 my-4"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="size-9" />
                    <InputOTPSlot index={1} className="size-9" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2} className="size-9" />
                    <InputOTPSlot index={3} className="size-9" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} className="size-9" />
                    <InputOTPSlot index={5} className="size-9" />
                  </InputOTPGroup>
                </InputOTP>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {form.formState.errors.otp?.message && (
            <FieldError>{form.formState.errors.otp?.message}</FieldError>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-xl sm:w-auto"
          >
            {isPending ? "Verifying..." : "Verify OTP"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full rounded-xl sm:w-auto"
            disabled={isPending}
            onClick={onResendOtp}
          >
            Resend OTP
          </Button>
        </FieldGroup>
      </form>
    </AuthFormPanel>
  );
}

export default VerifyOtpForm;
