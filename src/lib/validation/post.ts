import { z } from "zod";

// Uploaded media is served from our own domain as a relative path
// (e.g. "/api/files/…"); external media may be an absolute URL. Accept both.
export const mediaUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v.startsWith("/") || /^https?:\/\//i.test(v),
    "Invalid media link.",
  );

const imageSchema = z.object({
  url: mediaUrlSchema,
  thumbUrl: mediaUrlSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const postCreateSchema = z.object({
  body: z.string().trim().min(1, "Write something.").max(3000),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  websiteUrl: z.string().trim().url().max(300).optional().or(z.literal("")),
  ctaType: z.enum(["NONE", "CONTACT", "WHATSAPP", "CALL", "WEBSITE", "PROFILE"]),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaValue: z.string().trim().max(200).optional().or(z.literal("")),
  images: z.array(imageSchema).max(10).optional(),
  videoUrl: mediaUrlSchema.optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export const postUpdateSchema = postCreateSchema.partial().extend({
  body: z.string().trim().min(1).max(3000).optional(),
});

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1, "Write a comment.").max(1000),
  parentId: z.string().uuid().optional(),
});

// Minimum length for a comment to be eligible for points (anti-abuse).
export const MIN_REWARDABLE_COMMENT_LENGTH = 10;

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
