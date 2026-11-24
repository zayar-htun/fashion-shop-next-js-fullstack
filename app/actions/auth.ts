"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/role";
import { ErrorCodes } from "@/lib/error_code";
import { db } from "@/lib/prisma";
import {
  emailSchema,
  OtpInput,
  otpSchema,
  RegisterInput,
  registerSchema,
  LoginInput,
  loginSchema,
  EmailInput,
  ResetPasswordRequestInput,
  resetPasswordRequestSchema,
} from "@/lib/validations/auth";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import {
  applyPendingRegistration,
  upsertPendingRegisteration,
} from "@/lib/auth/pending-registartion";

import z from "zod";

export async function LoginUser(input: LoginInput) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const email = parsed.data.email.trim().toLowerCase();
  try {
    const user = await db.orm.public.User.select("isFrozen", "role")
      .where({ email })
      .first();
    if (user?.isFrozen) {
      return {
        success: false as const,
        error: ErrorCodes.ACCOUNT_FROZEN.message,
        code: ErrorCodes.ACCOUNT_FROZEN.code,
      };
    }
    if (user && isAdminRole(user.role)) {
      return {
        success: false as const,
        error: ErrorCodes.ADMIN_ACCOUNT.message,
        code: ErrorCodes.ADMIN_ACCOUNT.code,
      };
    }
    await auth.api.signInEmail({
      body: { email, password: parsed.data.password },
      headers: await headers(),
    });
    return {
      success: true as const,
      data: { email, requiresVerification: false },
    };
  } catch (error) {
    if (
      error instanceof APIError &&
      (error.body?.code === "EMAIL_NOT_VERIFIED" ||
        error.message === auth.$ERROR_CODES.EMAIL_NOT_VERIFIED)
    ) {
      try {
        await auth.api.sendVerificationOTP({
          body: { email, type: "email-verification" },
          headers: await headers(),
        });
        return {
          success: true as const,
          data: { email, requiresVerification: true },
        };
      } catch {
        return {
          success: false as const,
          error: "Unable to send the verification code. Please try again.",
        };
      }
    }
    return {
      success: false as const,
      error:
        error instanceof APIError && error.status === "UNAUTHORIZED"
          ? ErrorCodes.INVALID_CREDENTIALS.message
          : "Unable to sign in. Please try again.",
    };
  }
}

export async function RequestPasswordReset(input: EmailInput) {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: new URL(
          "/reset-password",
          auth.options.baseURL!,
        ).toString(),
      },
      headers: await headers(),
    });
    return { success: true as const, data: { email: parsed.data.email } };
  } catch {
    return {
      success: false as const,
      error: "Unable to request a reset link. Please try again.",
    };
  }
}

export async function ResetPassword(input: ResetPasswordRequestInput) {
  const parsed = resetPasswordRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  try {
    await auth.api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.password },
      headers: await headers(),
    });
    return { success: true as const };
  } catch (error) {
    if (
      error instanceof APIError &&
      (error.body?.code === "INVALID_TOKEN" ||
        error.message === auth.$ERROR_CODES.INVALID_TOKEN)
    ) {
      return {
        success: false as const,
        code: "INVALID_TOKEN",
        error:
          "This reset link is invalid or has expired. Please request a new one.",
      };
    }
    return {
      success: false as const,
      error: "Unable to reset your password. Please try again.",
    };
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof APIError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export async function RegisterUser(data: RegisterInput) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { name, email, password } = parsed.data;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await db.orm.public.User.select(
    "id",
    "email",
    "emailVerified",
    "role",
    "isFrozen",
  )
    .where({ email: normalizedEmail })
    .first();

  if (existingUser && existingUser?.isFrozen) {
    return {
      success: false,
      error: ErrorCodes.ACCOUNT_FROZEN.message,
      code: ErrorCodes.ACCOUNT_FROZEN.code,
    };
  }

  if (existingUser && isAdminRole(existingUser?.role)) {
    return {
      success: false,
      error: ErrorCodes.ADMIN_ACCOUNT.message,
      code: ErrorCodes.ADMIN_ACCOUNT.code,
    };
  }

  if (existingUser && existingUser?.emailVerified) {
    return {
      success: false,
      error: ErrorCodes.EMAIL_ALREADY_EXISTS.message,
      code: ErrorCodes.EMAIL_ALREADY_EXISTS.code,
    };
  }

  if (existingUser && !existingUser?.emailVerified) {
    try {
      await upsertPendingRegisteration(normalizedEmail, name, password);
      await auth.api.sendVerificationOTP({
        body: {
          email: normalizedEmail,
          type: "email-verification",
        },
        headers: await headers(),
      });
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to send email verification"),
      };
    }

    return {
      success: true,
      data: {
        email: normalizedEmail,
        resumed: true,
      },
    };
  }

  try {
    await auth.api.signUpEmail({
      body: {
        email: normalizedEmail,
        password,
        name,
      },
      headers: await headers(),
    });
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create account"),
    };
  }

  try {
    await auth.api.sendVerificationOTP({
      body: {
        email: normalizedEmail,
        type: "email-verification",
      },
      headers: await headers(),
    });
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to send email verification"),
    };
  }

  return {
    success: true,
    data: { name, email: normalizedEmail },
  };
}

export async function ResendVerificationOTP(input: OtpInput) {
  const parsed = otpSchema.safeParse(input); // Validate the input using the otpSchema
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { email, otp } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    await auth.api.verifyEmailOTP({
      body: {
        email: normalizedEmail,
        otp,
      },
      headers: await headers(),
    });
  } catch (error) {
    const message =
      error instanceof APIError ? error.message : "Failed to verify OTP";

    if (message.toLowerCase().includes("invalid otp")) {
      return {
        success: false,
        error: ErrorCodes.INVALID_OTP.message,
        code: ErrorCodes.INVALID_OTP.code,
      };
    }
    if (message.toLowerCase().includes("expired otp")) {
      return {
        success: false,
        error: ErrorCodes.OTP_EXPIRED.message,
        code: ErrorCodes.OTP_EXPIRED.code,
      };
    }
    if (message.toLowerCase().includes("too many")) {
      return {
        success: false,
        error: ErrorCodes.OTP_TOO_MANY.message,
        code: ErrorCodes.OTP_TOO_MANY.code,
      };
    }
    return {
      success: false,
      error: getErrorMessage(error, message),
    };
  }

  await applyPendingRegistration(normalizedEmail);

  return {
    success: true,
    data: { email: normalizedEmail },
  };
}

export async function resendRegistartionVerification(input: { email: string }) {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const normalizeEmail = parsed.data.email;

  const existingUser = await db.orm.public.User.select(
    "id",
    "emailVerified",
    "role",
    "isFrozen",
  )
    .where({ email: normalizeEmail })
    .first();

  if (!existingUser) {
    return {
      success: false,
      error: "No account found with this email. Please register first.",
    };
  }

  if (existingUser && existingUser?.isFrozen) {
    return {
      success: false,
      error: ErrorCodes.ACCOUNT_FROZEN.message,
      code: ErrorCodes.ACCOUNT_FROZEN.code,
    };
  }

  if (existingUser && isAdminRole(existingUser?.role)) {
    return {
      success: false,
      error: ErrorCodes.ADMIN_ACCOUNT.message,
      code: ErrorCodes.ADMIN_ACCOUNT.code,
    };
  }

  if (existingUser && existingUser?.emailVerified) {
    return {
      success: false,
      error: ErrorCodes.EMAIL_ALREADY_EXISTS.message,
      code: ErrorCodes.EMAIL_ALREADY_EXISTS.code,
    };
  }

  try {
    await auth.api.sendVerificationOTP({
      body: {
        email: normalizeEmail,
        type: "email-verification",
      },
      headers: await headers(),
    });
  } catch (error) {
    const message =
      error instanceof APIError
        ? error.message
        : "Fail to resend verification email.";
    return {
      success: false,
      error: message,
    };
  }

  return {
    success: true,
    data: { email: normalizeEmail },
    message: "Verification email resent successfully",
  };
}
