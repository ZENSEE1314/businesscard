// ONE-SHOT maintenance (removed after it runs once). Safe to re-run.
//  1) Delete all demo users (seeded @demo.konnect accounts).
//  2) Reset the platform admin password to INITIAL_ADMIN_PASSWORD and ensure
//     ADMIN / BRIDGEMASTER / ACTIVE.
//  3) Make hihta a BRIDGEMASTER business.
//  4) Everyone else becomes a free Bridge Member (no membership tier).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const log = (...a) => console.log("MAINT", ...a);

try {
  // 1) Remove demo accounts (cascades to their profiles/posts/etc.).
  const del = await prisma.user.deleteMany({
    where: { email: { endsWith: "@demo.konnect" } },
  });
  log("deleted demo users:", del.count);

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "").toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  // 2) Admin: reset password + top tier.
  let adminUserId = null;
  if (adminEmail && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (admin) {
      adminUserId = admin.id;
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          passwordHash: hash,
          role: "ADMIN",
          status: "ACTIVE",
          membershipTier: "BRIDGEMASTER",
          membershipStatus: "ACTIVE",
        },
      });
      log("admin reset + BRIDGEMASTER:", adminEmail);
    } else {
      log("admin not found for", adminEmail);
    }
  } else {
    log("INITIAL_ADMIN_EMAIL/PASSWORD not set — skipping admin reset");
  }

  // 3) hihta → BRIDGEMASTER business.
  const hihtaProfile = await prisma.profile.findUnique({
    where: { username: "hihtagohhengyi" },
    select: { userId: true },
  });
  let hihtaUserId = null;
  if (hihtaProfile) {
    hihtaUserId = hihtaProfile.userId;
    await prisma.user.update({
      where: { id: hihtaProfile.userId },
      data: {
        role: "BUSINESS",
        status: "ACTIVE",
        membershipTier: "BRIDGEMASTER",
        membershipStatus: "ACTIVE",
      },
    });
    log("hihta → BRIDGEMASTER");
  } else {
    log("hihta profile not found");
  }

  // 4) Everyone else → free Bridge Member (clear any tier).
  const keepIds = [adminUserId, hihtaUserId].filter(Boolean);
  const others = await prisma.user.updateMany({
    where: { id: { notIn: keepIds }, membershipTier: { not: null } },
    data: { membershipTier: null, membershipStatus: null },
  });
  log("reset to free Bridge Member:", others.count);

  log("done");
} catch (e) {
  console.log("MAINTERR", e?.message ?? String(e));
} finally {
  await prisma.$disconnect();
}
