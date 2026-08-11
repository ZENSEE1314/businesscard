import { z } from "zod";

const optionalStr = (max = 200) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .url("Enter a valid URL.")
  .optional()
  .or(z.literal(""));

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  displayName: optionalStr(80),
  bio: optionalStr(500),
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
