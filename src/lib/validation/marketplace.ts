import { z } from "zod";

export const marketplaceCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  priceNote: z.string().trim().max(80).optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
});
