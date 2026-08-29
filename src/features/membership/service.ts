import "server-only";
import { randomBytes } from "crypto";
import type { MembershipTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getTierConfig, membershipExpiry } from "@/lib/membership";
import { generateUniqueBusinessSlug } from "@/lib/auth/provisioning";
import { getReferralCommissionBps } from "@/lib/settings";
import { Errors } from "@/lib/api";

function orderCode(): string {
  return `MC-${randomBytes(4).toString("hex").toUpperCase()}`;
}

// Creates a pending membership order for a user. One pending order at a time.
export async function createMembershipOrder(userId: string, tier: MembershipTier) {
  const config = getTierConfig(tier);

  const pending = await prisma.membership.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (pending) {
    throw Errors.conflict(
      "You already have a pending membership order awaiting payment verification.",
    );
  }

  return prisma.membership.create({
    data: {
      userId,
      tier,
      status: "PENDING",
      priceIdr: config.priceIdr,
      orderCode: orderCode(),
    },
  });
}

// Admin approves an order: activates membership, upgrades the user to BUSINESS,
// provisions a business profile if needed, and notifies the member. Atomic.
export async function approveMembership(membershipId: string, adminId: string) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          businessProfile: { select: { id: true } },
          profile: { select: { fullName: true, username: true, companyName: true } },
        },
      },
    },
  });
  if (!membership) throw Errors.notFound("Membership order not found.");
  if (membership.status === "ACTIVE") {
    throw Errors.conflict("Membership is already active.");
  }

  const now = new Date();
  const expiresAt = membershipExpiry(now);
  const user = membership.user;

  // Business name: prefer existing company name, else the member's name.
  const businessName =
    user.profile?.companyName?.trim() ||
    user.profile?.fullName ||
    "My Business";
  const slug = user.businessProfile
    ? null
    : await generateUniqueBusinessSlug(businessName);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.membership.update({
      where: { id: membershipId },
      data: {
        status: "ACTIVE",
        startedAt: now,
        expiresAt,
        approvedById: adminId,
        approvedAt: now,
        rejectedReason: null,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        // Admins keep ADMIN (which already grants business capabilities);
        // everyone else is upgraded to BUSINESS.
        role: user.role === "ADMIN" ? "ADMIN" : "BUSINESS",
        membershipTier: membership.tier,
        membershipStatus: "ACTIVE",
        membershipExpiresAt: expiresAt,
      },
    });

    if (!user.businessProfile && slug) {
      await tx.businessProfile.create({
        data: {
          userId: user.id,
          slug,
          name: businessName,
          ownerName: user.profile?.fullName ?? null,
        },
      });
    }

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: `Welcome to ${getTierConfig(membership.tier).label} membership!`,
        body: "Your membership is active. You can now post to the feed and manage your business profile.",
        link: "/membership",
      },
    });

    // Referral commission: when the new member was referred by someone, the
    // referrer earns a configurable share (default 20%) of the membership
    // fee as IDR credit. Stored as a ReferralEarning for manual payout.
    const referrerId = await tx.user
      .findUnique({
        where: { id: user.id },
        select: { referredById: true },
      })
      .then((u) => u?.referredById ?? null);

    if (referrerId) {
      const rateBps = await getReferralCommissionBps();
      const amountIdr = Math.floor((membership.priceIdr * rateBps) / 10_000);
      if (amountIdr > 0) {
        await tx.referralEarning.create({
          data: {
            referrerId,
            referredUserId: user.id,
            membershipId: membership.id,
            tier: membership.tier,
            amountIdr,
            rateBps,
          },
        });
        await tx.notification.create({
          data: {
            userId: referrerId,
            type: "SYSTEM",
            title: "Referral commission earned!",
            body: `You earned Rp ${amountIdr.toLocaleString("id-ID")} commission from a new ${getTierConfig(membership.tier).label} member. Request a withdrawal from the Refer & Earn page.`,
            link: "/referrals",
          },
        });
      }
    }

    return updated;
  });
}

export async function rejectMembership(
  membershipId: string,
  adminId: string,
  reason: string,
) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, status: true, userId: true },
  });
  if (!membership) throw Errors.notFound("Membership order not found.");
  if (membership.status === "ACTIVE") {
    throw Errors.conflict("Cannot reject an active membership.");
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { status: "REJECTED", rejectedReason: reason, approvedById: adminId },
  });

  await prisma.notification.create({
    data: {
      userId: membership.userId,
      type: "SYSTEM",
      title: "Membership order not approved",
      body: reason || "Your membership order could not be verified. Please contact support.",
      link: "/membership",
    },
  });

  return updated;
}
