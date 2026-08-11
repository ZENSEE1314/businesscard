import { z } from "zod";

const optional = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const rewardCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: optional(500),
  imageUrl: z.string().url().optional().or(z.literal("")),
  category: optional(60),
  pointsCost: z.coerce.number().int().min(1),
  stock: z.coerce.number().int().min(0).optional().nullable(),
  maxPerUser: z.coerce.number().int().min(1).optional().nullable(),
  instructions: optional(500),
  terms: optional(500),
  active: z.boolean().optional(),
});

export const rewardUpdateSchema = rewardCreateSchema.partial();

export const awardCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optional(500),
  badgeUrl: z.string().url().optional().or(z.literal("")),
  category: optional(60),
  year: z.coerce.number().int().min(2000).max(2100).optional().nullable(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const awardWinnerSchema = z.object({
  businessSlug: z.string().trim().min(1),
  rank: z.coerce.number().int().min(1).optional().nullable(),
});

export const postModerateSchema = z.object({
  status: z.enum(["PUBLISHED", "HIDDEN", "DELETED"]),
});
