"use client";

import AuthFormPanel from "./auth-form-panel";
import Link from "next/link";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Controller, useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useEffect, useRef, useState, useTransition } from "react";
import { Clock3, MailCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema } from "@/lib/validations/auth";
import { RequestPasswordReset } from "@/app/actions/auth";

type ForgotPasswordInput = { email: string };

function ForgotPasswordForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [hasResent, setHasResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [requestError, setRequestError] = useState<string | null>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (submittedEmail) {
      confirmationHeading.current?.focus();
    }
  }, [submittedEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(
      () => setResendCooldown((seconds) => seconds - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function onSubmit(data: ForgotPasswordInput) {
    startTransition(async () => {
      form.clearErrors();
      setRequestError(null);
      try {
        const result = await RequestPasswordReset(data);
        if (!result.success) {
          if (result.fieldErrors?.email)
            form.setError("email", {
              message: result.fieldErrors.email.join(", "),
            });
          if (result.error) form.setError("root", { message: result.error });
          return;
        }
        setHasResent(false);
        setResendCooldown(60);
        setSubmittedEmail(result.data.email);
      } catch {
        form.setError("root", {
          message: "Unable to request a reset link. Please try again.",
        });
      }
    });
  }

  function onResend() {
    if (!submittedEmail || resendCooldown > 0) return;
    startTransition(async () => {
      setHasResent(false);
      setRequestError(null);
      try {
        const result = await RequestPasswordReset({ email: submittedEmail });
        if (!result.success) {
          setRequestError(
            result.error ||
              "Unable to resend the reset link. Please try again.",
          );
          return;
        }
        setHasResent(true);
        setResendCooldown(60);
      } catch {
        setRequestError("Unable to resend the reset link. Please try again.");
      }
    });
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
            <MailCheck className="size-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h2
              ref={confirmationHeading}
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight outline-none"
            >
              Check your email
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              If an account exists for{" "}
              <span className="text-foreground font-medium break-all">
                {submittedEmail}
              </span>
              , we&apos;ll send a password reset link.
            </p>
          </div>
        </div>

        <div className="text-muted-foreground flex flex-col gap-2 text-center text-sm">
          <p className="text-foreground flex items-center justify-center gap-2 font-medium">
            <Clock3 className="size-4" aria-hidden="true" />
            Link expires in 15 minutes
          </p>
          <p>Check your spam or junk folder if you don&apos;t see the email.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl"
            onClick={onResend}
            disabled={isPending || resendCooldown > 0}
          >
            {isPending
              ? "Sending..."
              : resendCooldown > 0
                ? `Resend email in ${resendCooldown}s`
                : "Resend email"}
          </Button>
          <p
            role="status"
            className="text-muted-foreground text-center text-sm"
          >
            {hasResent &&
              "If an account exists, a new reset link will be sent."}
          </p>
          {requestError && <FieldError>{requestError}</FieldError>}
        </div>

        <div className="flex justify-center border-t pt-6">
          <Button
            type="button"
            variant="link"
            disabled={isPending}
            onClick={() => {
              setSubmittedEmail(null);
              setHasResent(false);
              requestAnimationFrame(() => form.setFocus("email"));
            }}
          >
            Change email address
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AuthFormPanel
      title="Forgot password?"
      description="No worries. Enter your registered email and we'll send you a secure password reset link."
      footer={
        <p>
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            &larr; Back to Login
          </Link>
        </p>
      }
    >
      <form id="forgot-password-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="you@example.com"
                  className="h-11 rounded-xl"
                  {...field}
                />

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {form.formState.errors.root && (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          )}

          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={isPending}
          >
            {isPending ? "Sending..." : "Send reset link"}
          </Button>
        </FieldGroup>
      </form>
    </AuthFormPanel>
  );
}

export default ForgotPasswordForm;
