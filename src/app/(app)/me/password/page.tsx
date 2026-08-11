"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { apiFetch } from "@/lib/client";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    const res = await apiFetch("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not change password.");
      return;
    }
    setDone(true);
    setCurrent("");
    setNew("");
    setConfirm("");
  }

  return (
    <div className="mx-auto max-w-md px-3 py-4 sm:px-4">
      <h1 className="px-1 pb-3 text-xl font-bold">Change password</h1>
      <Card className="p-5">
        {done && (
          <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-success">
            Password changed. Other devices have been signed out.
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <Label>Current password</Label>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted">
              At least 8 characters, with a letter and a number.
            </p>
          </div>
          <div>
            <Label>Confirm new password</Label>
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Change password"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/me")}>
              Back
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
