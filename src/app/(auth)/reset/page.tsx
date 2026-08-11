"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/client";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await apiFetch("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not reset password.");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <Card className="p-6 sm:p-8">
        <h1 className="text-xl font-bold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted">
          This reset link is missing its token. Request a new one.
        </p>
        <Link href="/forgot" className="mt-4 inline-block text-sm font-medium text-primary">
          Request a new link
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      {done ? (
        <div className="mt-4">
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
            Your password has been reset. You can now log in.
          </div>
          <Button className="mt-4 w-full" size="lg" onClick={() => router.push("/login")}>
            Go to log in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <Label>New password</Label>
            <PasswordInput
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              At least 8 characters, with a letter and a number.
            </p>
          </div>
          <div>
            <Label>Confirm password</Label>
            <PasswordInput
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "Saving…" : "Reset password"}
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
