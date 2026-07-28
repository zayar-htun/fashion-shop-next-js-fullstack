import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";
import { connection } from "next/server";
import { Suspense } from "react";

function ShopLayoutFallback() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur">
        <div className="flex h-16 items-center px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 justify-between gap-4">
          <Skeleton className="h-6 w-32 rounded-md" />
          <div className="flex items-center gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="size-6 w-16 rounded-md" />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96 max-w-full" />
          </div>
          <Skeleton className="h-10 w-full max-w-full" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="aspect-3/4 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

async function ShopShell({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await getSession();
  return (
    <div>
      <p>shopHeader</p>
      {children}
    </div>
  );
}

function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShopLayoutFallback />}>
      <ShopShell>{children}</ShopShell>
    </Suspense>
  );
}

export default ShopLayout;
