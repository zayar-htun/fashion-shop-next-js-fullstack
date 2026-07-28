import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { SendEmail } from "./email";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000", // for seperate frontend/backend domains
  //   trustedOrigins: ["http://localhost:3000"], // for seperate frontend/backend domains
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
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
          forget_password: "Reset Your Password",
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
