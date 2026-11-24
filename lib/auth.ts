import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db, prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { SendEmail } from "./email";
import { ErrorCodes } from "./error_code";
import { isAdminRole } from "./auth/role";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000", // for seperate frontend/backend domains
  //   trustedOrigins: ["http://localhost:3000"], // for seperate frontend/backend domains
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const user = await db.orm.public.User.select("isFrozen", "role")
            .where({ id: session.userId })
            .first();
          if (user?.isFrozen) {
            throw new APIError("FORBIDDEN", ErrorCodes.ACCOUNT_FROZEN);
          }
          if (user && isAdminRole(user.role)) {
            throw new APIError("FORBIDDEN", ErrorCodes.ADMIN_ACCOUNT);
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 15 * 60,
    revokeSessionsOnPasswordReset: true,
    async onPasswordReset({ user }) {
      await db.orm.public.PendingRegistration.where({
        email: user.email,
      }).delete();
    },
    async sendResetPassword({ user, url }) {
      const safeUrl = url
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      await SendEmail({
        to: user.email,
        subject: "Reset your Fashion Shop password",
        html: `<h1>Reset your password</h1><p>We received a request to reset your Fashion Shop password.</p><p><a href="${safeUrl}">Reset password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
      });
    },
  },
  emailVerification: {
    autoSignInAfterVerification: true, // optional, automatically sign in the user after email verification
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account", // optional, forces account selection on every login
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
  },
  //   session: {
  //         cookieCache: {
  //             enabled: true,
  //             maxAge: 5 * 60, // 5 min cache
  //             strategy: "compact" // or "jwt" or "jwe"
  //         }
  //     },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const subject: Record<string, string> = {
          "email-verification": "Verify Your Email",
          "forget-password": "Reset Your Password",
          "sign-in": "Your Sign-in Code",
        };
        await SendEmail({
          to: email,
          subject: subject[type],
          html: `<p> Your verification code is: <strong> ${otp} </strong> </p>`,
        });
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
