import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadModule(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name) => (name in mocks ? mocks[name] : require(name)),
    console: { error() {} },
  });
  return module.exports;
}

const validations = loadModule("lib/validations/cart.ts");

function fixture({
  quantity,
  stock = 5,
  isActive = true,
  userId = "user-1",
} = {}) {
  const rows = new Map();
  if (quantity !== undefined) rows.set("user-1:variant-1", quantity);
  const variant = { id: "variant-1", stock, product: { isActive } };
  const paths = [];
  let creates = 0;
  let tail = Promise.resolve();
  const db = {
    raw: {
      sql(strings, ...values) {
        return {
          returnsRow: () => ({
            build: () => ({ sql: strings.join("?"), values }),
          }),
        };
      },
    },
    async transaction(callback) {
      let unlock;
      const tx = {
        query(plan) {
          assert.match(plan.sql, /FOR UPDATE OF v/);
          assert.match(plan.sql, /FOR SHARE OF p/);
          return {
            async toArray() {
              const previous = tail;
              tail = new Promise((resolve) => {
                unlock = resolve;
              });
              await previous;
              return [];
            },
          };
        },
        orm: {
          public: {
            ProductVariant: {
              where: ({ id }) => ({
                include: () => ({
                  first: async () => (id === variant.id ? variant : null),
                }),
              }),
            },
            CartItem: {
              where: ({ userId, variantId }) => {
                const key = `${userId}:${variantId}`;
                return {
                  first: async () =>
                    rows.has(key) ? { quantity: rows.get(key) } : null,
                  update: async ({ quantity }) => rows.set(key, quantity),
                  delete: async () => rows.delete(key),
                };
              },
              create: async ({ userId, variantId, quantity }) => {
                creates++;
                const key = `${userId}:${variantId}`;
                assert.equal(
                  rows.has(key),
                  false,
                  "must not insert the same variant twice",
                );
                rows.set(key, quantity);
              },
            },
          },
        },
      };
      try {
        return await callback(tx);
      } finally {
        unlock?.();
      }
    },
  };
  const actions = loadModule("app/actions/cart.ts", {
    "@/lib/session": {
      getSession: async () => (userId ? { user: { id: userId } } : null),
    },
    "@/lib/validations/cart": validations,
    "@/lib/prisma": { db },
    "next/cache": { revalidatePath: (path) => paths.push(path) },
  });
  return {
    ...actions,
    rows,
    variant,
    paths,
    get creates() {
      return creates;
    },
  };
}

const input = (quantity = 1) => ({ variantId: "variant-1", quantity });

test("creates one cart row without reducing stock", async () => {
  const f = fixture();
  const result = await f.addToCartAction(input(2));
  assert.equal(result.success, true);
  assert.equal(result.data.quantity, 2);
  assert.equal(f.rows.get("user-1:variant-1"), 2);
  assert.equal(f.creates, 1);
  assert.equal(f.variant.stock, 5);
  assert.deepEqual(f.paths, ["/cart"]);
});

test("adds to the existing quantity up to the stock limit", async () => {
  const f = fixture({ quantity: 3 });
  assert.equal((await f.addToCartAction(input(2))).success, true);
  assert.equal(f.rows.get("user-1:variant-1"), 5);
  assert.equal(f.creates, 0);
});

test("rejects a combined quantity above stock and preserves the cart", async () => {
  const f = fixture({ quantity: 4 });
  const result = await f.addToCartAction(input(2));
  assert.equal(result.success, false);
  assert.match(result.error, /Only 5 available.*already contains 4/);
  assert.equal(f.rows.get("user-1:variant-1"), 4);
  assert.equal(f.paths.length, 0);
});

test("rejects inactive, missing, and out-of-stock variants", async () => {
  for (const options of [{ isActive: false }, { stock: 0 }]) {
    const f = fixture(options);
    assert.equal((await f.addToCartAction(input())).success, false);
    assert.equal(f.rows.size, 0);
  }
  const f = fixture();
  assert.equal(
    (await f.addToCartAction({ variantId: "missing", quantity: 1 })).success,
    false,
  );
});

test("requires authentication and validates positive integer quantities", async () => {
  const guest = fixture({ userId: null });
  assert.equal(
    (await guest.addToCartAction(input())).error,
    "User not authenticated",
  );
  for (const quantity of [0, -1, 1.5, "2", Number.MAX_SAFE_INTEGER + 1]) {
    const f = fixture();
    assert.equal((await f.addToCartAction(input(quantity))).success, false);
    assert.equal(f.rows.size, 0);
  }
});

test("keeps each user's cart separate", async () => {
  const f = fixture({ userId: "user-2", quantity: 4 });
  assert.equal((await f.addToCartAction(input(2))).success, true);
  assert.equal(f.rows.get("user-1:variant-1"), 4);
  assert.equal(f.rows.get("user-2:variant-1"), 2);
});

test("concurrent additions wait for the lock before reading the cart", async () => {
  const f = fixture({ stock: 3 });
  const results = await Promise.all([
    f.addToCartAction(input(2)),
    f.addToCartAction(input(2)),
  ]);
  assert.equal(results.filter((result) => result.success).length, 1);
  assert.equal(f.rows.get("user-1:variant-1"), 2);
  assert.equal(f.creates, 1);
});

test("quantity controls replace the quantity and enforce stock", async () => {
  const f = fixture({ quantity: 3 });
  assert.equal((await f.updateCartQuantityAction(input(2))).success, true);
  assert.equal(f.rows.get("user-1:variant-1"), 2);
  assert.equal((await f.updateCartQuantityAction(input(6))).success, false);
  assert.equal(f.rows.get("user-1:variant-1"), 2);
});

test("unavailable items can still be removed", async () => {
  const f = fixture({ quantity: 3, isActive: false, stock: 0 });
  assert.equal((await f.updateCartQuantityAction(input(0))).success, true);
  assert.equal(f.rows.size, 0);
});
