"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/role";
import { ErrorCodes } from "@/lib/error_code";
import { db } from "@/lib/prisma";
import {
  OtpInput,
  otpSchema,
  RegisterInput,
  registerSchema,
} from "@/lib/validations/auth";
import { APIError } from "better-auth";
import { headers } from "next/headers";
import {
  applyPendingRegistration,
  upsertPendingRegisteration,
} from "@/lib/auth/pending-registartion";

import z from "zod";

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
