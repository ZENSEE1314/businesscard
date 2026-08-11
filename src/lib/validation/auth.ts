import { z } from "zod";
import { isReservedSlug } from "@/lib/utils";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be at most 30 characters.")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores and hyphens.",
  )
  .refine((v) => !isReservedSlug(v), "That username is reserved.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");

// Everyone registers as a free member. Business status is unlocked later via a
// paid Member Club membership (approved by an admin), never at signup.
export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Enter a valid email."),
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().trim().min(2, "Enter your name.").max(80),
    referralCode: z.string().trim().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
});

export const passwordResetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
