import { z } from "zod";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { logAdminAction } from "@/lib/admin-log";
import { Errors, getClientIp, handle, ok } from "@/lib/api";
import { TIER_ORDER } from "@/lib/membership";

// Everything an admin may change on a member account from the admin panel.
// Each accepted field is logged in AdminLog with before/after snapshots.
const patchSchema = z
  .object({
    // Points: set to an absolute value, or add/subtract with a note.
    points: z.coerce.number().int().min(0).max(10_000_000).optional(),
    pointsDelta: z.coerce.number().int().min(-1_000_000).max(1_000_000).optional(),
    pointsReason: z.string().trim().max(200).optional().or(z.literal("")),
    // Package (membership tier). BRIDGEMAKER / BRIDGEMASTER / FREE = none.
    membershipTier: z.enum([...TIER_ORDER, "FREE"]).optional(),
    // Role. The acting admin cannot demote themselves (lock-out protection).
    role: z.enum(["USER", "BUSINESS", "ADMIN"]).optional(),
    // Block / unblock. BANNED users cannot log in; existing sessions die.
    status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
    // Basic profile edits.
    fullName: z.string().trim().min(2).max(80).optional(),
    jobTitle: z.string().trim().max(80).optional(),
    companyName: z.string().trim().max(80).optional(),
    bio: z.string().trim().max(600).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." })
  .refine((v) => !(v.points !== undefined && v.pointsDelta !== undefined), {
    message: "Use either points or pointsDelta, not both.",
  });

async function loadTarget(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      points: true,
      membershipTier: true,
      membershipStatus: true,
      membershipExpiresAt: true,
      profile: {
        select: { id: true, fullName: true, jobTitle: true, companyName: true, bio: true },
      },
    },
  });
  if (!user) throw Errors.notFound("User not found.");
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const user = await loadTarget(id);
    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      points: user.points,
      membershipTier: user.membershipTier,
      membershipStatus: user.membershipStatus,
      membershipExpiresAt: user.membershipExpiresAt?.toISOString() ?? null,
      fullName: user.profile?.fullName ?? "",
      jobTitle: user.profile?.jobTitle ?? "",
      companyName: user.profile?.companyName ?? "",
      bio: user.profile?.bio ?? "",
    });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = patchSchema.parse(await req.json());
    const target = await loadTarget(id);
    if (target.id === admin.id && input.role && input.role !== "ADMIN") {
      throw Errors.badRequest("You cannot demote your own admin account.");
    }
    if (target.id === admin.id && input.status && input.status !== "ACTIVE") {
      throw Errors.badRequest("You cannot block your own admin account.");
    }

    const ip = getClientIp(req);
    const adminName = target.profile?.fullName ?? target.email;

    // --- Points adjustment ---------------------------------------------------
    if (input.points !== undefined || input.pointsDelta !== undefined) {
      const next = input.points ?? target.points + (input.pointsDelta ?? 0);
      if (next < 0) throw Errors.badRequest("Points cannot go below zero.");
      const delta = next - target.points;
      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { points: next } }),
        prisma.pointTransaction.create({
          data: {
            userId: id,
            type: "ADMIN_ADJUST",
            amount: delta,
            balanceAfter: next,
            createdByAdmin: admin.id,
            description:
              input.pointsReason?.trim() ||
              `Adjusted by admin (${delta >= 0 ? "+" : ""}${delta})`,
          },
        }),
      ]);
      await logAdminAction({
        adminId: admin.id,
        action: "user.points",
        targetType: "user",
        targetId: id,
        targetUsername: adminName,
        oldValue: { points: target.points },
        newValue: { points: next, reason: input.pointsReason ?? null },
        ip,
      });
    }

    // --- Membership tier (package) -------------------------------------------
    if (input.membershipTier !== undefined) {
      const tier = input.membershipTier === "FREE" ? null : input.membershipTier;
      const expiresAt = tier
        ? (target.membershipStatus === "ACTIVE" ? target.membershipExpiresAt : null) ??
          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : null;
      await prisma.user.update({
        where: { id },
        data: {
          membershipTier: tier,
          membershipStatus: tier ? "ACTIVE" : null,
          membershipExpiresAt: expiresAt,
        },
      });
      await logAdminAction({
        adminId: admin.id,
        action: "user.tier",
        targetType: "user",
        targetId: id,
        targetUsername: adminName,
        oldValue: { membershipTier: target.membershipTier },
        newValue: { membershipTier: tier, expiresAt: expiresAt?.toISOString() ?? null },
        ip,
      });
    }

    // --- Role / status ---------------------------------------------------------
    const userUpdates: {
      role?: "USER" | "BUSINESS" | "ADMIN";
      status?: "ACTIVE" | "SUSPENDED" | "BANNED";
    } = {};
    if (input.role && input.role !== target.role) userUpdates.role = input.role;
    if (input.status && input.status !== target.status) userUpdates.status = input.status;
    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({ where: { id }, data: userUpdates });
      // Blocking kills existing sessions immediately.
      if (userUpdates.status && userUpdates.status !== "ACTIVE") {
        await prisma.session.updateMany({
          where: { userId: id },
          data: { revokedAt: new Date() },
        });
      }
      const action =
        userUpdates.role && userUpdates.status
          ? "user.role_status"
          : userUpdates.role
            ? "user.role"
            : "user.status";
      await logAdminAction({
        adminId: admin.id,
        action,
        targetType: "user",
        targetId: id,
        targetUsername: adminName,
        oldValue: { role: target.role, status: target.status },
        newValue: userUpdates,
        ip,
      });
    }

    // --- Profile edits -----------------------------------------------------------
    if (target.profile) {
      const p = target.profile;
      const profileUpdates: Record<string, string | null> = {};
      if (input.fullName !== undefined && input.fullName !== p.fullName)
        profileUpdates.fullName = input.fullName;
      if (input.jobTitle !== undefined && input.jobTitle !== p.jobTitle)
        profileUpdates.jobTitle = input.jobTitle || null;
      if (input.companyName !== undefined && input.companyName !== p.companyName)
        profileUpdates.companyName = input.companyName || null;
      if (input.bio !== undefined && input.bio !== p.bio) profileUpdates.bio = input.bio || null;
      if (Object.keys(profileUpdates).length > 0) {
        await prisma.profile.update({ where: { id: p.id }, data: profileUpdates });
        await logAdminAction({
          adminId: admin.id,
          action: "user.profile",
          targetType: "user",
          targetId: id,
          targetUsername: profileUpdates.fullName ?? p.fullName,
          oldValue: { fullName: p.fullName, jobTitle: p.jobTitle, companyName: p.companyName, bio: p.bio },
          newValue: profileUpdates,
          ip,
        });
      }
    }

    // --- Email change --------------------------------------------------------------
    if (input.email && input.email !== target.email) {
      const dupe = await prisma.user.findUnique({ where: { email: input.email } });
      if (dupe) throw Errors.conflict("That email is already in use.");
      await prisma.user.update({ where: { id }, data: { email: input.email } });
      await logAdminAction({
        adminId: admin.id,
        action: "user.email",
        targetType: "user",
        targetId: id,
        targetUsername: adminName,
        oldValue: { email: target.email },
        newValue: { email: input.email },
        ip,
      });
    }

    return ok({ updated: true });
  });
}

// DELETE removes the account permanently. The acting admin cannot delete
// themselves. Cascades remove the profile, posts, chats, memberships, etc.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await params;
    if (id === admin.id) throw Errors.badRequest("You cannot delete your own account here.");

    const target = await loadTarget(id);
    await prisma.user.delete({ where: { id } });
    await logAdminAction({
      adminId: admin.id,
      action: "user.delete",
      targetType: "user",
      targetId: id,
      targetUsername: target.profile?.fullName ?? target.email,
      oldValue: { email: target.email, role: target.role, status: target.status },
      ip: getClientIp(req),
    });
    return ok({ deleted: true });
  });
}
