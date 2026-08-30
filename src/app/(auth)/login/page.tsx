"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, Label } from "@/components/ui";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/client";
import { useT } from "@/lib/i18n/client";
import { LanguagePicker } from "@/components/language-picker";

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const REMEMBER_KEY = "remembered-email";

  // Prefill the email on this device when the user chose to be remembered. The
  // browser's password manager fills the password (see credential store below).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Login failed.");
      return;
    }

    // Remember (or forget) the credentials on this device.
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email);
        // Ask the browser to store the password securely (Credential Mgmt API).
        const w = window as unknown as {
          PasswordCredential?: new (data: {
            id: string;
            password: string;
          }) => Credential;
        };
        if (w.PasswordCredential && navigator.credentials?.store) {
          const cred = new w.PasswordCredential({ id: email, password });
          await navigator.credentials.store(cred).catch(() => undefined);
        }
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      /* best-effort; never block login */
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-3 flex justify-end">
        <LanguagePicker />
      </div>
      <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
      <p className="mt-1 text-sm text-muted">{t("auth.loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="password" className="mb-0">
              {t("auth.password")}
            </Label>
            <Link href="/forgot" className="text-xs font-medium text-primary">
              {t("auth.forgot")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          {t("auth.rememberMe")}
        </label>
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? t("auth.loggingIn") : t("auth.login")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary">
          {t("auth.createOne")}
        </Link>
      </p>
    </Card>
  );
}
