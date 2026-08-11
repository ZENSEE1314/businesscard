import "server-only";
import type { Role } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/current-user";
import { Errors } from "@/lib/api";

// Backend authorization. Frontend hiding of buttons is never sufficient —
// every mutating API route must call one of these.

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw Errors.forbidden();
  }
  return user;
}

export async function requireBusiness(): Promise<CurrentUser> {
  // Admins are allowed to act in business contexts for moderation/testing.
  return requireRole("BUSINESS", "ADMIN");
}

export async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("ADMIN");
}

export function isAdmin(user: CurrentUser | null): boolean {
  return user?.role === "ADMIN";
}

export function isBusiness(user: CurrentUser | null): boolean {
  return user?.role === "BUSINESS";
}
