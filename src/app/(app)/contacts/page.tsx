import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, Users, MessageCircle, IdCard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listContacts } from "@/lib/contacts";
import type { ContactSource } from "@prisma/client";
import { Card } from "@/components/ui";
import { DeleteContactButton } from "@/components/contact-row-actions";
import { EditContactButton } from "@/components/edit-contact-button";
import { getLocale, tt } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Contacts" };

const SOURCES: { value: string; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "MANUAL", label: "Manual" },
  { value: "QR_SCAN", label: "QR scan" },
  { value: "SHARED_LINK", label: "Shared link" },
  { value: "NFC_CARD", label: "NFC card" },
  { value: "EVENT", label: "Event" },
  { value: "REFERRAL", label: "Referral" },
  { value: "CARD_SIGNUP", label: "Card signup" },
];

const SORTS = [
  { value: "recent", label: "Newest first" },
  { value: "name", label: "Name A–Z" },
  { value: "company", label: "Company A–Z" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const sourceLabel: Record<string, string> = {
  MANUAL: "Added manually",
  QR_SCAN: "QR scan",
  SHARED_LINK: "Shared link",
  NFC_CARD: "NFC card",
  EVENT: "Event",
  REFERRAL: "Referral",
  CARD_SIGNUP: "Card signup",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; sort?: string; category?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const source = (sp.source ?? "") as ContactSource | "";
  const sort = ["recent", "name", "company"].includes(sp.sort ?? "")
    ? (sp.sort as "recent" | "name" | "company")
    : "recent";

  const categoryFilter = sp.category ?? "";
  const contacts = await listContacts(user.id, {
    search: q || undefined,
    source: source || undefined,
    category: categoryFilter || undefined,
    sort,
  });

  // Distinct categories the user has assigned, for the filter + edit suggestions.
  const allForCategories = await listContacts(user.id, {});
  const categoryOptions = Array.from(
    new Set(
      allForCategories
        .map((c) => c.category)
        .filter((v): v is string => Boolean(v && v.trim())),
    ),
  ).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{tt(locale, "contacts.title")}</h1>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
          {tt(locale, "contacts.saved", { n: contacts.length })}
        </span>
      </div>

      {/* Filters — a plain GET form so it works without JavaScript too */}
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={tt(locale, "contacts.searchPlaceholder")}
            aria-label="Search contacts"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <select
          name="source"
          defaultValue={source}
          aria-label="Filter by source"
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {categoryOptions.length > 0 && (
          <select
            name="category"
            defaultValue={categoryFilter}
            aria-label="Filter by category"
            className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
          >
            <option value="">{tt(locale, "contacts.allCategories")}</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
        <select
          name="sort"
          defaultValue={sort}
          aria-label="Sort contacts"
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
        >
          {tt(locale, "contacts.apply")}
        </button>
      </form>

      {contacts.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 font-medium">{tt(locale, "contacts.none")}</p>
          <p className="mt-1 text-sm text-muted">
            {tt(locale, "contacts.noneHint")}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => {
            const p = c.contact.profile;
            const name = p?.displayName || p?.fullName || "BridgeX member";
            return (
              <li
                key={c.id}
                className="relative flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                {p?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                ) : (
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">
                    {initials(name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/u/${p?.username}`} className="truncate font-medium hover:text-primary">
                      {name}
                    </Link>
                    {c.category && (
                      <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                        {c.category}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">
                    {[p?.jobTitle, p?.companyName].filter(Boolean).join(" · ") ||
                      [p?.city, p?.country].filter(Boolean).join(", ") ||
                      "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Added{" "}
                    {new Intl.DateTimeFormat("en", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(c.createdAt)}
                    {c.source !== "MANUAL" && ` · via ${sourceLabel[c.source] ?? c.source}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/u/${p?.username}`}
                    aria-label={`View ${name}'s digital card`}
                    title="Digital card"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-surface-2"
                  >
                    <IdCard className="h-4 w-4" />
                  </Link>
                  <Link
                    href={
                      p?.username
                        ? `/chat?with=${encodeURIComponent(p.username)}`
                        : "/chat"
                    }
                    aria-label={`Message ${name}`}
                    title="Message"
                    className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-surface-2"
                  >
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </Link>
                  <EditContactButton
                    contactId={c.id}
                    name={name}
                    initialCategory={c.category ?? null}
                    initialNotes={c.notes ?? null}
                    categorySuggestions={categoryOptions}
                  />
                  <DeleteContactButton contactId={c.id} name={name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
