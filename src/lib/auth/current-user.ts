import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Role, MembershipTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifySessionToken } from "./jwt";
import { SESSION_COOKIE, isSessionActive } from "./session";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  status: string;
  points: number;
  sessionId: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  businessSlug: string | null;
  membershipTier: MembershipTier | null;
}

// Resolves the authenticated user for the current request, or null.
// Cached per-request so multiple callers don't repeat the DB work.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const active = await isSessionActive(payload.sid);
  if (!active) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      points: true,
      membershipTier: true,
      profile: { select: { username: true, fullName: true, avatarUrl: true } },
      businessProfile: { select: { slug: true } },
    },
  });

  if (!user) return null;
  if (user.status === "BANNED" || user.status === "SUSPENDED") return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    points: user.points,
    sessionId: payload.sid,
    username: user.profile?.username ?? null,
    fullName: user.profile?.fullName ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    businessSlug: user.businessProfile?.slug ?? null,
    membershipTier: user.membershipTier,
  };
});
