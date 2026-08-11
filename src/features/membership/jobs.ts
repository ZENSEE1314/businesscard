import "server-only";
import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email";
import { getTierConfig, formatIdr } from "@/lib/membership";
import { absoluteUrl } from "@/lib/utils";
import { env } from "@/lib/env";

// Downgrades memberships whose yearly term has ended back to the free plan.
export async function expireMemberships(): Promise<number> {
  const now = new Date();
  const expired = await prisma.membership.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: now } },
    include: { user: { select: { id: true, role: true } } },
  });

  for (const m of expired) {
    await prisma.$transaction([
      prisma.membership.update({
        where: { id: m.id },
        data: { status: "EXPIRED" },
      }),
      prisma.user.update({
        where: { id: m.userId },
        data: {
          membershipStatus: "EXPIRED",
          membershipTier: null,
          // Admins keep admin; everyone else returns to the free USER plan.
          role: m.user.role === "ADMIN" ? "ADMIN" : "USER",
        },
      }),
      prisma.notification.create({
        data: {
          userId: m.userId,
          type: "SYSTEM",
          title: "Your membership has expired",
          body: "You're now on the free plan. Renew anytime to restore your business benefits.",
          link: "/membership",
        },
      }),
    ]);
  }
  return expired.length;
}

// Immediately downgrades a single user if their membership has lapsed
// (used at login so the account is correct without waiting for the daily job).
export async function expireUserMembershipIfDue(userId: string): Promise<void> {
  const m = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (!m) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  await prisma.$transaction([
    prisma.membership.update({ where: { id: m.id }, data: { status: "EXPIRED" } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        membershipStatus: "EXPIRED",
        membershipTier: null,
        role: user?.role === "ADMIN" ? "ADMIN" : "USER",
      },
    }),
  ]);
}

// Sends a one-time renewal reminder ~30 days before a membership expires.
export async function sendRenewalReminders(): Promise<number> {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const due = await prisma.membership.findMany({
    where: {
      status: "ACTIVE",
      reminderSentAt: null,
      expiresAt: { gt: now, lte: in30Days },
    },
    include: {
      user: {
        select: {
          email: true,
          profile: { select: { fullName: true } },
        },
      },
    },
  });

  for (const m of due) {
    const tier = getTierConfig(m.tier);
    const dateStr = m.expiresAt ? m.expiresAt.toLocaleDateString("en-GB") : "soon";
    await prisma.notification.create({
      data: {
        userId: m.userId,
        type: "SYSTEM",
        title: "Membership renewal reminder",
        body: `Your ${tier.label} membership expires on ${dateStr}. Renew to keep your benefits.`,
        link: "/membership",
      },
    });
    await sendEmail({
      to: m.user.email,
      subject: `Your ${env.appName} membership expires soon`,
      text: `Hi ${m.user.profile?.fullName ?? "there"},\n\nYour ${tier.label} membership (${formatIdr(m.priceIdr)}/year) expires on ${dateStr}.\n\nRenew here: ${absoluteUrl("/membership")}\n\n— ${env.appName}`,
    });
    await prisma.membership.update({
      where: { id: m.id },
      data: { reminderSentAt: now },
    });
  }
  return due.length;
}

export async function runMembershipMaintenance(): Promise<void> {
  try {
    const expired = await expireMemberships();
    const reminded = await sendRenewalReminders();
    if (expired || reminded) {
      console.log(`[membership] expired=${expired} reminded=${reminded}`);
    }
  } catch (err) {
    console.error("[membership] maintenance error", err);
  }
}
