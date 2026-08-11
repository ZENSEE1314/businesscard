"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await apiFetch("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setSent(true);
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      {sent ? (
        <p className="mt-3 text-sm text-muted">
          If an account exists for <strong>{email}</strong>, we’ve sent a reset
          link. Check your inbox (and spam). The link is valid for 1 hour.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Enter your email and we’ll send you a reset link.
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {busy ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary">
          Back to log in
        </Link>
      </p>
    </Card>
  );
}
