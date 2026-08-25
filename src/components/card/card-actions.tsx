"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Download,
  Share2,
  Check,
  Copy,
  Pencil,
} from "lucide-react";
import { SaveContactButton } from "@/components/card/save-contact-button";

type TrackType =
  | "PROFILE_SHARE"
  | "QR_VIEW"
  | "CONTACT_SAVE"
  | "WHATSAPP_CLICK"
  | "PHONE_CLICK"
  | "EMAIL_CLICK"
  | "WEBSITE_CLICK";

function track(type: TrackType, targetId: string) {
  // Fire-and-forget; never block the navigation.
  const payload = JSON.stringify({ type, targetId });
  const beacon =
    typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
      ? navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        )
      : false;
  if (!beacon) {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}

const actionBtn =
  "flex flex-1 min-w-[92px] flex-col items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 py-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-2";

export function ContactActions({
  targetId,
  vcardUrl,
  whatsapp,
  tel,
  mailto,
  website,
  messageHref,
  isOwner = false,
  editHref = "/me/edit",
  saveInApp = null,
}: {
  targetId: string;
  vcardUrl: string;
  whatsapp: string | null;
  tel: string | null;
  mailto: string | null;
  website: string | null;
  messageHref: string;
  isOwner?: boolean;
  editHref?: string;
  // When set (signed-in non-owner viewer), "Save contact" also stores the
  // owner into the visitor's BridgeX contact list.
  saveInApp?: { username: string; registerHref: string; source?: "QR_SCAN" | "SHARED_LINK" | "NFC_CARD" | "MANUAL" } | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {isOwner ? (
        <Link
          href={editHref}
          className={`${actionBtn} !bg-primary !text-primary-fg !border-transparent`}
        >
          <Pencil className="h-5 w-5" />
          Edit
        </Link>
      ) : saveInApp ? (
        <div className="w-full">
          <SaveContactButton
            username={saveInApp.username}
            vcardUrl={vcardUrl}
            registerHref={saveInApp.registerHref}
            source={saveInApp.source}
          />
        </div>
      ) : (
        <a
          href={vcardUrl}
          onClick={() => track("CONTACT_SAVE", targetId)}
          className={`${actionBtn} !bg-primary !text-primary-fg !border-transparent`}
        >
          <Download className="h-5 w-5" />
          Save contact
        </a>
      )}
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("WHATSAPP_CLICK", targetId)}
          className={actionBtn}
        >
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp
        </a>
      )}
      {tel && (
        <a
          href={tel}
          onClick={() => track("PHONE_CLICK", targetId)}
          className={actionBtn}
        >
          <Phone className="h-5 w-5" />
          Call
        </a>
      )}
      {mailto && (
        <a
          href={mailto}
          onClick={() => track("EMAIL_CLICK", targetId)}
          className={actionBtn}
        >
          <Mail className="h-5 w-5" />
          Email
        </a>
      )}
      <a href={messageHref} className={actionBtn}>
        <MessageCircle className="h-5 w-5 text-primary" />
        Message
      </a>
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("WEBSITE_CLICK", targetId)}
          className={actionBtn}
        >
          <Globe className="h-5 w-5" />
          Website
        </a>
      )}
    </div>
  );
}

export function ShareButton({
  targetId,
  url,
  title,
}: {
  targetId: string;
  url: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function nativeShare() {
    track("PROFILE_SHARE", targetId);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to menu */
      }
    }
    setOpen((o) => !o);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    track("PROFILE_SHARE", targetId);
    setTimeout(() => setCopied(false), 1800);
  }

  const enc = encodeURIComponent(url);
  const encTitle = encodeURIComponent(title);
  const targets = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encTitle}%20${enc}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc}&text=${encTitle}` },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`,
    },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc}&text=${encTitle}` },
  ];

  return (
    <div className="relative">
      <button
        onClick={nativeShare}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium hover:bg-surface-2"
      >
        <Share2 className="h-4 w-4" /> Share profile
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-border bg-surface p-2 shadow-lg">
          <button
            onClick={copyLink}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Link copied" : "Copy link"}
          </button>
          {targets.map((t) => (
            <a
              key={t.label}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
            >
              {t.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
