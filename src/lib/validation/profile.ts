import { z } from "zod";

const optionalStr = (max = 200) =>
  z.string().trim().max(max).optional().or(z.literal(""));

// Accepts a website with or without a protocol. Empty stays empty; a bare
// domain like "rebornwave.group" gets "https://" prepended; validated with the
// URL parser so any real domain/TLD is accepted. Returns "" or a full URL.
function isParsableUrl(v: string): boolean {
  if (v === "") return true;
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

const optionalUrl = z.preprocess((val) => {
  const t = typeof val === "string" ? val.trim() : "";
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}, z.string().max(300).refine(isParsableUrl, "Enter a valid website (e.g. rebornwave.group)."));

const tagList = z
  .array(z.string().trim().min(1).max(40))
  .max(12)
  .optional();

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  displayName: optionalStr(80),
  headline: optionalStr(160),
  canHelp: tagList,
  lookingFor: tagList,
  bio: optionalStr(2000),
  jobTitle: optionalStr(120),
  companyName: optionalStr(120),
  phone: optionalStr(40),
  whatsapp: optionalStr(40),
  email: z.string().trim().max(160).email().optional().or(z.literal("")),
  website: optionalUrl,
  address: optionalStr(200),
  city: optionalStr(80),
  country: optionalStr(80),
  instagram: optionalStr(120),
  facebook: optionalStr(120),
  tiktok: optionalStr(120),
  linkedin: optionalStr(120),
  telegram: optionalStr(120),
  twitter: optionalStr(120),
  showPhone: z.boolean(),
  showEmail: z.boolean(),
  showWhatsapp: z.boolean(),
  showAddress: z.boolean(),
});

export const businessUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(120),
  ownerName: optionalStr(80),
  showOwner: z.boolean(),
  headline: optionalStr(160),
  canHelp: tagList,
  lookingFor: tagList,
  description: optionalStr(1000),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  phone: optionalStr(40),
  whatsapp: optionalStr(40),
  email: z.string().trim().max(160).email().optional().or(z.literal("")),
  website: optionalUrl,
  address: optionalStr(200),
  mapUrl: optionalUrl,
  city: optionalStr(80),
  country: optionalStr(80),
  instagram: optionalStr(120),
  facebook: optionalStr(120),
  tiktok: optionalStr(120),
  linkedin: optionalStr(120),
  telegram: optionalStr(120),
  twitter: optionalStr(120),
});

// Accept our relative upload paths ("/api/files/…") as well as absolute URLs.
const mediaLink = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
    "Invalid media link.",
  );

export const businessMediaSchema = z.object({
  section: z.enum(["PRODUCT", "INTRO"]),
  kind: z.enum(["IMAGE", "VIDEO"]),
  url: mediaLink,
  thumbUrl: mediaLink.optional().or(z.literal("")),
  caption: z.string().trim().max(200).optional().or(z.literal("")),
});

export const usernameUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>;

// Empty strings represent "clear this field" — convert to null for the DB.
export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}
