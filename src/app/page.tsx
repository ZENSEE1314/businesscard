import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  IdCard,
  MessageSquare,
  Trophy,
  Gift,
  Share2,
  QrCode,
  ArrowRight,
} from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/logo";
import { InstallButton } from "@/components/install-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { env } from "@/lib/env";

const leadership = [
  { name: "Hihta Goh", role: "President" },
  { name: "Dato Lee", role: "Vice President" },
  { name: "Zen See", role: "CTO" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const features = [
  { icon: Users, title: "Discover Businesses", desc: "Find trusted local businesses in a clean, social feed." },
  { icon: IdCard, title: "Digital Name Card", desc: "Share a beautiful profile link that opens with one tap — no app needed." },
  { icon: MessageSquare, title: "Connect Instantly", desc: "Message people and businesses directly, in real time." },
  { icon: Gift, title: "Earn & Redeem", desc: "Collect points for real activity and redeem them for rewards." },
  { icon: Trophy, title: "Business Awards", desc: "Celebrate the best businesses, recognised and verified." },
  { icon: QrCode, title: "QR & Save Contact", desc: "One tap to save a contact to your phone or scan a QR code." },
];

export default async function LandingPage() {
  // Signed-in users land on their dashboard, never on marketing pages.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const appName = env.appName;
  return (
    <main className="flex-1">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Logo size={32} />
            {appName}
          </Link>
          <nav className="flex items-center gap-2">
            <ButtonLink href="/login" variant="ghost" size="sm">
              Log in
            </ButtonLink>
            <ButtonLink href="/register" size="sm">
              Get started
            </ButtonLink>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="aurora">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            <Share2 className="h-3.5 w-3.5" /> Your business, one tap away
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Connect. Discover.{" "}
            <span className="bg-gradient-to-r from-brand-600 to-accent bg-clip-text text-transparent">
              Grow.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
            Build your professional profile, discover trusted businesses,
            connect directly and earn rewards — all in one friendly app.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/register" size="lg" className="w-full sm:w-auto">
              Create my free profile <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              href="/membership"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Explore Member Club
            </ButtonLink>
          </div>
          <div className="mt-4 flex justify-center">
            <InstallButton label="Download app to Home Screen" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership */}
      <section className="mx-auto max-w-4xl px-4 pb-8">
        <h2 className="text-center text-2xl font-bold">Leadership</h2>
        <p className="mt-1 text-center text-sm text-muted">
          The team behind {appName}.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {leadership.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm"
            >
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent text-lg font-bold text-white">
                {initials(p.name)}
              </div>
              <h3 className="mt-3 font-semibold">{p.name}</h3>
              <p className="text-sm text-muted">{p.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-fg">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Create your own digital name card
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-fg/80">
            It’s free. Share your profile through WhatsApp, Instagram, a QR code
            or any link.
          </p>
          <div className="mt-6">
            <ButtonLink
              href="/register"
              variant="secondary"
              size="lg"
              className="bg-white text-brand-700"
            >
              Get started free
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row">
          <span>
            © {new Date().getFullYear()} {appName}
          </span>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
