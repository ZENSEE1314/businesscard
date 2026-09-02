"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Handshake,
  Briefcase,
  Users,
  Truck,
  Network,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Business Opportunities board — six sections (investors, customers,
// suppliers, distributors, partnerships, jobs) with tab filtering and
// animated listing cards.
// ---------------------------------------------------------------------------

export interface OpportunityItem {
  id: string;
  title: string;
  description: string | null;
  priceNote: string | null;
  createdAt: string;
  sellerName: string;
  sellerUsername: string | null;
  sellerAvatarUrl: string | null;
  sellerTier: string | null;
}

export interface OpportunitySection {
  key: string;
  label: string;
  items: OpportunityItem[];
}

const SECTION_ICONS: Record<string, typeof Handshake> = {
  INVESTORS: Handshake,
  CUSTOMERS: Users,
  SUPPLIERS: Truck,
  DISTRIBUTORS: Network,
  PARTNERSHIP: Briefcase,
  JOBS: Megaphone,
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function OpportunityBoard({
  sections,
  messageLabel,
  emptyLabel,
}: {
  sections: OpportunitySection[];
  messageLabel: string;
  emptyLabel: string;
}) {
  const [active, setActive] = useState<string>("ALL");
  const visible =
    active === "ALL" ? sections : sections.filter((s) => s.key === active);
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setActive("ALL")}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
            active === "ALL"
              ? "border-brand-600 bg-brand-600 text-white shadow-sm"
              : "border-border bg-surface text-muted hover:bg-surface-2",
          )}
        >
          All ({total})
        </button>
        {sections.map((s) => {
          const Icon = SECTION_ICONS[s.key] ?? Handshake;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                active === s.key
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-border bg-surface text-muted hover:bg-surface-2",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label} ({s.items.length})
            </button>
          );
        })}
      </div>
      {/* Listing cards */}
      {visible.map((section) => {
        const Icon = SECTION_ICONS[section.key] ?? Handshake;
        return (
          <section key={section.key} className="space-y-2">
            <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
              <Icon className="h-4 w-4 text-brand-600" />
              {section.label}
              <span className="text-xs font-normal text-muted">
                ({section.items.length})
              </span>
            </h2>
            {section.items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
                {emptyLabel}
              </p>
            ) : (
              section.items.map((item, i) => (
                <article
                  key={item.id}
                  className="anim-float rounded-2xl border border-border bg-surface p-4 shadow-sm"
                  style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    {item.priceNote && (
                      <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                        {item.priceNote}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted">
                      {item.description}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                        {item.sellerAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.sellerAvatarUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          item.sellerName.charAt(0)
                        )}
                      </span>
                      {item.sellerUsername ? (
                        <Link
                          href={`/u/${item.sellerUsername}`}
                          className="hover:underline"
                        >
                          {item.sellerName}
                        </Link>
                      ) : (
                        item.sellerName
                      )}
                    </span>
                    {item.sellerTier && (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 font-medium">
                        {item.sellerTier}
                      </span>
                    )}
                    <span>· {timeAgo(item.createdAt)}</span>
                  </div>
                  {item.sellerUsername && (
                    <Link
                      href={`/chat?with=${encodeURIComponent(item.sellerUsername)}`}
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-primary transition-colors hover:bg-surface-2"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> {messageLabel}
                    </Link>
                  )}
                </article>
              ))
            )}
          </section>
        );
      })}

      {total === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}