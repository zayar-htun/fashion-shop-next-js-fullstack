import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { APIError, betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

const require = createRequire(import.meta.url);

// Load the real server modules with isolated database, headers, and mail transports.
// Better Auth itself runs unchanged against its in-memory database adapter.
function loadModule(path, mocks = {}, env = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(
    outputText,
    {
      module,
      exports: module.exports,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
      process: { env },
      console,
      URL,
    },
    { filename: path },
  );
  return module.exports;
}

const validations = loadModule("lib/validations/auth.ts");
const errorCodes = loadModule("lib/error_code.ts");
const roles = loadModule("lib/auth/role.ts");
const email = "customer@example.com";
const password = "OriginalPassword1";
const newPassword = "UpdatedPassword2";

function fixture() {
  const store = { user: [], account: [], session: [], verification: [] };
  const emails = [];
  const pendingCleared = [];
  let failMail = false;
  const db = {
    orm: {
      public: {
        User: {
          select: () => ({
            where: (filter) => ({
              first: async () =>
                store.user.find((user) =>
                  Object.entries(filter).every(
                    ([key, value]) => user[key] === value,
                  ),
                ),
            }),
          }),
        },
        PendingRegistration: {
          where: ({ email }) => ({
            delete: async () => pendingCleared.push(email),
          }),
        },
      },
    },
  };
  const { auth } = loadModule("lib/auth.ts", {
    "better-auth": {
      APIError,
      betterAuth: (options) =>
        betterAuth({
          ...options,
          secret: "test-secret-for-auth-regression-tests-only-123456789",
          socialProviders: {},
          rateLimit: { enabled: false },
          logger: { disabled: true },
        }),
    },
    "better-auth/adapters/prisma": {
      prismaAdapter: () => memoryAdapter(store),
    },
    "@/lib/prisma": { prisma: {}, db },
    "./error_code": errorCodes,
    "./auth/role": roles,
    "better-auth/next-js": {
      nextCookies: () => ({ id: "test-cookie-context" }),
    },
    "./email": {
      SendEmail: async (message) => {
        if (failMail) throw new Error("Mail transport unavailable");
        emails.push(message);
      },
    },
  });
  const actions = loadModule("app/actions/auth.ts", {
    "@/lib/auth": { auth },
    "@/lib/auth/role": roles,
    "@/lib/error_code": errorCodes,
    "@/lib/prisma": { db },
    "@/lib/validations/auth": validations,
    "better-auth": { APIError },
    "next/headers": {
      headers: async () => new Headers({ origin: "http://localhost:3000" }),
    },
    "@/lib/auth/pending-registartion": {
      applyPendingRegistration: async () => false,
      upsertPendingRegisteration: async () => {},
    },
  });
  async function register(verified = true) {
    const result = await actions.RegisterUser({
      name: "Test Customer",
      email,
      password,
      confirmPassword: password,
    });
    assert.equal(result.success, true, result.error);
    store.user[0].emailVerified = verified;
    return result;
  }
  function resetToken() {
    const html = emails.at(-1).html;
    const link = html.match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&");
    return { link, token: new URL(link).pathname.split("/").at(-1) };
  }
  return {
    auth,
    actions,
    store,
    emails,
    pendingCleared,
    register,
    resetToken,
    failMail: () => {
      failMail = true;
    },
  };
}

test("registration still sends a verification OTP to the registered email", async () => {
  const f = fixture();
  await f.register(false);
  assert.equal(f.emails.length, 1);
  assert.equal(f.emails[0].to, email);
  assert.match(f.emails[0].html, /\d{6}/);
});

test("login authenticates, creates a session cookie, and rejects a wrong password", async () => {
  const f = fixture();
  await f.register();
  const result = await f.actions.LoginUser({
    email: email.toUpperCase(),
    password,
  });
  assert.equal(result.success, true);
  assert.equal(result.data.requiresVerification, false);
  assert.equal(f.store.session.length, 1);
  const response = await f.auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  assert.match(response.headers.get("set-cookie"), /session_token=/);
  const invalid = await f.actions.LoginUser({
    email,
    password: "IncorrectPassword1",
  });
  assert.equal(invalid.success, false);
  assert.equal(
    invalid.error,
    errorCodes.ErrorCodes.INVALID_CREDENTIALS.message,
  );
});

test("unverified login sends an OTP and verification creates the session", async () => {
  const f = fixture();
  await f.register(false);
  const result = await f.actions.LoginUser({ email, password });
  assert.equal(result.success, true, result.error);
  assert.equal(result.data.requiresVerification, true);
  assert.equal(f.store.session.length, 0);
  const otp = f.emails.at(-1).html.match(/\d{6}/)[0];
  assert.equal(
    (await f.actions.ResendVerificationOTP({ email, otp })).success,
    true,
  );
  assert.equal(f.store.user[0].emailVerified, true);
  assert.equal(f.store.session.length, 1);
});

test("login preserves frozen and admin account restrictions", async () => {
  const f = fixture();
  await f.register();
  f.store.user[0].isFrozen = true;
  assert.equal(
    (await f.actions.LoginUser({ email, password })).code,
    "ACCOUNT_FROZEN",
  );
  await assert.rejects(
    f.auth.api.signInEmail({ body: { email, password } }),
    (error) => error.body?.code === "ACCOUNT_FROZEN",
  );
  f.store.user[0].isFrozen = false;
  f.store.user[0].role = "ADMIN";
  assert.equal(
    (await f.actions.LoginUser({ email, password })).code,
    "ADMIN_ACCOUNT",
  );
  assert.equal(f.store.session.length, 0);
});

test("reset email uses a 15 minute token; resetting changes credentials and revokes sessions", async () => {
  const f = fixture();
  await f.register();
  await f.actions.LoginUser({ email, password });
  const result = await f.actions.RequestPasswordReset({
    email: ` ${email.toUpperCase()} `,
  });
  assert.equal(result.success, true, result.error);
  assert.equal(f.emails.at(-1).to, email);
  const { link, token } = f.resetToken();
  assert.equal(
    new URL(link).searchParams.get("callbackURL"),
    "http://localhost:3000/reset-password",
  );
  const verification = f.store.verification.find(
    (row) => row.identifier === `reset-password:${token}`,
  );
  assert.ok(
    Math.abs(new Date(verification.expiresAt).getTime() - Date.now() - 900000) <
      5000,
  );
  const callback = await f.auth.handler(new Request(link));
  assert.equal(
    new URL(callback.headers.get("location")).searchParams.get("token"),
    token,
  );
  const reset = await f.actions.ResetPassword({
    token,
    password: newPassword,
    confirmPassword: newPassword,
  });
  assert.equal(reset.success, true, reset.error);
  assert.equal(f.store.session.length, 0);
  assert.equal(f.pendingCleared[0], email);
  assert.equal((await f.actions.LoginUser({ email, password })).success, false);
  assert.equal(
    (await f.actions.LoginUser({ email, password: newPassword })).success,
    true,
  );
  assert.equal(
    (
      await f.actions.ResetPassword({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      })
    ).code,
    "INVALID_TOKEN",
  );
});

test("expired and missing reset tokens fail; mismatched passwords leave the token usable", async () => {
  const f = fixture();
  await f.register();
  await f.actions.RequestPasswordReset({ email });
  const { token } = f.resetToken();
  const mismatch = await f.actions.ResetPassword({
    token,
    password: newPassword,
    confirmPassword: password,
  });
  assert.equal(mismatch.success, false);
  assert.ok(mismatch.fieldErrors.confirmPassword);
  assert.ok(
    f.store.verification.some(
      (row) => row.identifier === `reset-password:${token}`,
    ),
  );
  const missing = await f.actions.ResetPassword({
    token: "",
    password: newPassword,
    confirmPassword: newPassword,
  });
  assert.equal(missing.success, false);
  assert.ok(missing.fieldErrors.token);
  f.store.verification.find(
    (row) => row.identifier === `reset-password:${token}`,
  ).expiresAt = new Date(Date.now() - 1000);
  assert.equal(
    (
      await f.actions.ResetPassword({
        token,
        password: newPassword,
        confirmPassword: newPassword,
      })
    ).code,
    "INVALID_TOKEN",
  );
  assert.equal((await f.actions.LoginUser({ email, password })).success, true);
});

test("unknown reset recipients and delivery failures keep the generic reset response", async () => {
  const f = fixture();
  const unknown = await f.actions.RequestPasswordReset({ email });
  assert.equal(unknown.success, true);
  assert.equal(f.emails.length, 0);
  await f.register();
  f.failMail();
  // Better Auth logs delivery errors while keeping its enumeration-safe response.
  assert.equal((await f.actions.RequestPasswordReset({ email })).success, true);
});

test("invalid form data is rejected before creating an account, session, or email", async () => {
  const f = fixture();
  assert.equal(
    (await f.actions.LoginUser({ email: "invalid", password })).success,
    false,
  );
  assert.equal(
    (await f.actions.RequestPasswordReset({ email: "invalid" })).success,
    false,
  );
  assert.equal(f.store.session.length, 0);
  assert.equal(f.store.user.length, 0);
  assert.equal(f.emails.length, 0);
});

test("login accepts existing credentials independently of the new-password policy", async () => {
  const f = fixture();
  const existingPassword = "legacy-password";
  await f.auth.api.signUpEmail({
    body: { name: "Existing Customer", email, password: existingPassword },
  });
  f.store.user[0].emailVerified = true;
  assert.equal(
    (await f.actions.LoginUser({ email, password: existingPassword })).success,
    true,
  );
  assert.equal(
    (
      await f.actions.ResetPassword({
        token: "test",
        password: existingPassword,
        confirmPassword: existingPassword,
      })
    ).success,
    false,
  );
});
