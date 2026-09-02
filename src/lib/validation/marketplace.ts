import { z } from "zod";

// Business Opportunities sections. Every new listing is posted under one of
// these intents; legacy rows may have null (shown under "All" only).
export const OPPORTUNITY_SECTIONS = [
  "INVESTORS",
  "CUSTOMERS",
  "SUPPLIERS",
  "DISTRIBUTORS",
  "PARTNERSHIP",
  "JOBS",
] as const;

export const marketplaceCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  section: z.enum(OPPORTUNITY_SECTIONS),
  priceNote: z.string().trim().max(80).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
});
