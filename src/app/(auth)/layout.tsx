import Link from "next/link";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center px-4 py-10 aurora">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg">
          K
        </span>
        {env.appName}
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
