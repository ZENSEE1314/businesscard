import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "register",
  "signup",
  "signin",
  "logout",
  "settings",
  "support",
  "help",
  "about",
  "terms",
  "privacy",
  "feed",
  "awards",
  "chat",
  "rewards",
  "profile",
  "u",
  "business",
  "join",
  "notifications",
  "search",
  "explore",
  "onboarding",
  "dashboard",
  "static",
  "_next",
  "public",
  "favicon.ico",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

// 3-30 chars, letters/numbers/underscore/hyphen, case-insensitive uniqueness handled by DB.
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username) && !isReservedSlug(username);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

// Normalize a phone number to international E.164-ish form for tel:/wa.me links.
// Keeps a leading +, strips spaces/dashes/parens. If it starts with 00, convert to +.
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[\s()\-.]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  const hasPlus = s.startsWith("+");
  const digits = s.replace(/[^0-9]/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return hasPlus ? "+" + digits : digits;
}

// wa.me requires digits only, no +.
export function whatsappNumber(input: string | null | undefined): string | null {
  const n = normalizePhone(input);
  if (!n) return null;
  return n.replace(/^\+/, "");
}

export function absoluteUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return d.toLocaleDateString();
}
