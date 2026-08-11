"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/client";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialType = params.get("type") === "business" ? "BUSINESS" : "USER";

  const [accountType, setAccountType] = useState<"USER" | "BUSINESS">(
    initialType,
  );
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    referralCode: params.get("ref") ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await apiFetch<{ needsOnboarding: boolean }>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ ...form, accountType }),
      },
    );
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Registration failed.");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted">
        Free forever. Your digital name card is created instantly.
      </p>

      {/* Account type toggle */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-1">
        {(["USER", "BUSINESS"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAccountType(t)}
            className={`h-9 rounded-md text-sm font-medium transition-colors ${
              accountType === t
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted"
            }`}
          >
            {t === "USER" ? "Personal" : "Business"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
          />
        </div>
        {accountType === "BUSINESS" && (
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              required
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
            />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            At least 8 characters, with a letter and a number.
          </p>
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary">
          Log in
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
