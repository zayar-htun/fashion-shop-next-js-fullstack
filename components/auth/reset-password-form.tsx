"use client";

import AuthFormPanel from "./auth-form-panel";
import Link from "next/link";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Controller, useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, CircleCheck, LogOut, ShieldCheck } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { ResetPassword } from "@/app/actions/auth";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [invalidToken, setInvalidToken] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const hasInvalidLink = !token || searchParams.has("error") || invalidToken;
  const successHeading = useRef<HTMLHeadingElement>(null);

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (isSuccess) {
      successHeading.current?.focus();
    }
  }, [isSuccess]);

  function onSubmit(data: ResetPasswordInput) {
    if (hasInvalidLink) return;
    startTransition(async () => {
      form.clearErrors();
      try {
        const result = await ResetPassword({ ...data, token });
        if (!result.success) {
          if (result.code === "INVALID_TOKEN") setInvalidToken(true);
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, errors]) => {
              if (field === "token") {
                setInvalidToken(true);
              } else if (errors?.length) {
                form.setError(field as keyof ResetPasswordInput, {
                  message: errors.join(", "),
                });
              }
            });
          }
          if (result.error) form.setError("root", { message: result.error });
          return;
        }
        form.reset();
        setIsSuccess(true);
        router.replace("/reset-password", { scroll: false });
      } catch {
        form.setError("root", {
          message: "Unable to reset your password. Please try again.",
        });
      }
    });
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
            <CircleCheck className="size-8" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h2
              ref={successHeading}
              tabIndex={-1}
              className="text-3xl font-semibold tracking-tight outline-none"
            >
              Password reset successful!
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your password has been updated. You can now sign in using your new
              password.
            </p>
          </div>
        </div>

        <ul className="bg-muted flex flex-col gap-4 rounded-xl p-4 text-sm">
          <li className="flex items-center gap-3">
            <ShieldCheck
              className="text-primary size-4 shrink-0"
              aria-hidden="true"
            />
            Password updated securely
          </li>
          <li className="flex items-center gap-3">
            <LogOut
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
            Previous sessions revoked
          </li>
        </ul>

        <Button
          className="h-11 w-full rounded-xl"
          render={<Link href="/login" />}
        >
          Back to login
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    );
  }

  if (hasInvalidLink) {
    return (
      <AuthFormPanel
        title="Request a new reset link"
        description="This password reset link is missing, invalid, or has expired. Request a new link to reset your password."
      >
        <Button
          className="h-11 w-full rounded-xl"
          render={<Link href="/forgot-password" />}
        >
          Request reset link
        </Button>
      </AuthFormPanel>
    );
  }

  return (
    <AuthFormPanel
      title="Set new password"
      description="Create a strong password to secure your account."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Create Account
          </Link>
        </p>
      }
    >
      <form id="reset-password-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                </div>

                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter your password"
                  className="h-11 rounded-xl"
                  {...field}
                />

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="confirm-password">
                    Confirm Password
                  </FieldLabel>
                </div>

                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  placeholder="Confirm your new password"
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
            {isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </FieldGroup>
      </form>
    </AuthFormPanel>
  );
}

export default ResetPasswordForm;
