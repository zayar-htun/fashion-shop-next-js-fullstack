"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";
import { RegisterInput, registerSchema } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signUp, emailOtp } from "@/lib/auth-client";
import { RegisterUser } from "@/app/actions/auth";
import AuthFormPanel from "./auth-form-panel";
import Link from "next/link";
import { Marker, MarkerContent } from "../ui/marker";
import GoogleSigninButton from "./google-signin-button";

export default function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(data: RegisterInput) {
    startTransition(async () => {
      const result = await RegisterUser(data);
      if (!result?.success) {
        if (result?.code === "ACCOUNT_FROZEN") {
          router.push("/login/frozen");
        }
        if (result?.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, errors]) => {
            if (errors && errors.length > 0) {
              form.setError(field as keyof RegisterInput, {
                message: errors.join(", "),
              });
            }
          });
        }
        if (result.error) {
          form.setError("root", { message: result.error });
        }
        return;
      }

      const verifyOTPUrl = new URL("/verify-otp", window.location.origin);
      verifyOTPUrl.searchParams.set("email", result?.data!.email);
      verifyOTPUrl.searchParams.set("flow", "register");
      if (result?.data?.resumed) {
        verifyOTPUrl.searchParams.set("resumed", "true");
      }

      router.push(verifyOTPUrl.toString());
    });
  }

  return (
    <AuthFormPanel
      title="Create an account"
      description="Join our community and start shopping today!"
      footer={
        <p>
          Already have an account?
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            Sign In
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

      <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="name">Full name</FieldLabel>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Alex Rivera"
                  className="h-11 rounded-xl"
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
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
                  placeholder="you@example.com"
                  className="h-11 rounded-xl"
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create password"
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
                  <FieldLabel htmlFor="confirmPassword">Confirm</FieldLabel>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    className="h-11 rounded-xl"
                    {...field}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
          {form.formState.errors.root && (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          )}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl"
            disabled={isPending}
          >
            {isPending ? "Creating account..." : "Create account"}
          </Button>
        </FieldGroup>
      </form>
    </AuthFormPanel>
  );
}
