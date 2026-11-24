"use client";

import AuthFormPanel from "./auth-form-panel";
import GoogleSigninButton from "./google-signin-button";
import Link from "next/link";
import { Marker, MarkerContent } from "../ui/marker";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Controller, useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput, loginSchema } from "@/lib/validations/auth";
import { LoginUser } from "@/app/actions/auth";
import { sanitizeCallbackUrl } from "@/lib/auth/safe-redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginInput) {
    startTransition(async () => {
      form.clearErrors();
      try {
        const result = await LoginUser(data);
        if (!result.success) {
          if (result.fieldErrors) {
            Object.entries(result.fieldErrors).forEach(([field, errors]) => {
              if (errors?.length)
                form.setError(field as keyof LoginInput, {
                  message: errors.join(", "),
                });
            });
          }
          if (result.error) form.setError("root", { message: result.error });
          return;
        }
        const callbackUrl = sanitizeCallbackUrl(
          searchParams.get("callbackUrl"),
        );
        if (result.data.requiresVerification) {
          const params = new URLSearchParams({
            email: result.data.email,
            flow: "login",
            callbackUrl,
          });
          router.push(`/verify-otp?${params}`);
          return;
        }
        router.replace(callbackUrl);
        router.refresh();
      } catch {
        form.setError("root", {
          message: "Unable to sign in. Please try again.",
        });
      }
    });
  }

  return (
    <AuthFormPanel
      title="Welcome back"
      description="Sign in to your account to continue."
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
      <GoogleSigninButton />

      <Marker variant="separator">
        <MarkerContent className="text-muted-foreground text-[11px] tracking-[0.18rem]">
          OR CONTINUE WITH EMAIL
        </MarkerContent>
      </Marker>

      <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
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

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>

                  <Link
                    href="/forgot-password"
                    className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  placeholder="Enter your password"
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
            {isPending ? "Signing in..." : "Sign In"}
          </Button>
        </FieldGroup>
      </form>
    </AuthFormPanel>
  );
}

export default LoginForm;
