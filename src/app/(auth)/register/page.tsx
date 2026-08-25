"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/client";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const ref = params.get("ref") ?? "";
  const viaCard = Boolean(ref && (params.get("src") || params.get("card")));
  const referrerName = params.get("by") ?? "";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: ref,
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
        body: JSON.stringify(form),
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
        Free forever. Your digital name card is created instantly. Upgrade to a
        Member Club business membership anytime.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}
        {viaCard && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
            You&rsquo;re joining through{" "}
            {referrerName ? <strong>{referrerName}&rsquo;s</strong> : "a member&rsquo;s"}{" "}
            digital card. After registering, they&rsquo;ll be saved to your contacts
            and you&rsquo;ll appear in their network &mdash; that&rsquo;s how BridgeX connects
            people. You can remove the connection anytime.
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
          <PasswordInput
            id="password"
            name="password"
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
          <PasswordInput
            id="confirmPassword"
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
