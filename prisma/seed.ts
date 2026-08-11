import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const POINT_RULES = [
  { eventKey: "register", description: "Registered an account", points: 50 },
  { eventKey: "complete_profile", description: "Completed your profile", points: 100 },
  {
    eventKey: "complete_business_profile",
    description: "Completed business profile",
    points: 150,
  },
  { eventKey: "daily_login", description: "Daily login", points: 5, cooldownSec: 72000 },
  {
    eventKey: "valid_comment",
    description: "Posted a helpful comment",
    points: 2,
    dailyLimit: 10,
    cooldownSec: 30,
  },
  { eventKey: "create_post", description: "Published a post", points: 10, dailyLimit: 20 },
  { eventKey: "referral", description: "Referred a new member", points: 100 },
  { eventKey: "verified_business", description: "Business verified", points: 200 },
];

const CATEGORIES = [
  "Food & Beverage",
  "Entertainment",
  "Beauty",
  "Retail",
  "Technology",
  "Property",
  "Tourism",
  "Automotive",
  "Education",
  "Professional Services",
  "Healthcare",
  "Fitness",
  "Other",
];

const SETTINGS: Record<string, unknown> = {
  platformName: "Konnect",
  registrationEnabled: true,
  businessRegistrationEnabled: true,
  businessApprovalRequired: false,
  pointsEnabled: true,
  chatEnabled: true,
  rewardsEnabled: true,
  referralPoints: 100,
  maintenanceMode: false,
  supportEmail: "support@konnect.app",
  termsUrl: "/legal/terms",
  privacyUrl: "/legal/privacy",
  membershipBank: {
    bankName: "Bank BCA",
    accountNumber: "1234567890",
    accountHolder: "Member Club Indonesia",
  },
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  console.log("Seeding point rules...");
  for (const rule of POINT_RULES) {
    await prisma.pointRule.upsert({
      where: { eventKey: rule.eventKey },
      update: {
        description: rule.description,
        points: rule.points,
        dailyLimit: rule.dailyLimit ?? null,
        cooldownSec: rule.cooldownSec ?? null,
      },
      create: rule,
    });
  }

  console.log("Seeding categories...");
  const categoryMap = new Map<string, string>();
  let order = 0;
  for (const name of CATEGORIES) {
    const cat = await prisma.businessCategory.upsert({
      where: { slug: slugify(name) },
      update: { name, sortOrder: order },
      create: { name, slug: slugify(name), sortOrder: order },
    });
    categoryMap.set(name, cat.id);
    order += 1;
  }

  console.log("Seeding system settings...");
  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }

  // Admin from env (do not hardcode credentials in the repo).
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const adminName = process.env.INITIAL_ADMIN_NAME || "Platform Admin";
  const adminUsername = slugify(adminName).replace(/-/g, "") || "admin";
  if (adminEmail && adminPassword) {
    console.log(`Seeding admin ${adminEmail} (${adminName})...`);
    const hash = await bcrypt.hash(adminPassword, 12);
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
      include: { profile: true },
    });
    if (existing) {
      // Ensure the account is an admin, but NEVER clobber an existing user's
      // password or profile on redeploys — that would wipe any password they set.
      if (existing.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: "ADMIN" },
        });
      }
    } else {
      // Ensure the admin username is free before creating.
      const taken = await prisma.profile.findUnique({
        where: { username: adminUsername },
      });
      await prisma.user.create({
        data: {
          email: adminEmail.toLowerCase(),
          passwordHash: hash,
          role: "ADMIN",
          emailVerified: new Date(),
          profile: {
            create: {
              username: taken ? `${adminUsername}${Date.now().toString().slice(-4)}` : adminUsername,
              fullName: adminName,
            },
          },
        },
      });
    }
  } else {
    console.warn("INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD not set — skipping admin.");
  }

  // Demo content is only seeded when SEED_DEMO=true, never in production by default.
  if (process.env.SEED_DEMO === "true") {
    await seedDemo(categoryMap);
  }

  console.log("Seed complete.");
}

async function seedDemo(categoryMap: Map<string, string>) {
  console.log("Seeding demo users & businesses...");
  const demoPassword = await bcrypt.hash("Demo!2026pass", 12);

  const makeUser = async (
    email: string,
    role: Role,
    username: string,
    fullName: string,
    jobTitle?: string,
  ) =>
    prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: demoPassword,
        role,
        emailVerified: new Date(),
        points: 120,
        lifetimeEarned: 120,
        profile: {
          create: { username, fullName, jobTitle, city: "Singapore", country: "SG" },
        },
      },
    });

  const users = [];
  for (let i = 1; i <= 5; i++) {
    users.push(
      await makeUser(`user${i}@demo.konnect`, "USER", `user${i}`, `Demo User ${i}`),
    );
  }

  const businessSeeds = [
    { username: "rebornwave", name: "Reborn Wave Group", cat: "Entertainment", owner: "John Tan" },
    { username: "brewhaus", name: "Brew Haus Coffee", cat: "Food & Beverage", owner: "Mia Lee" },
    { username: "glowbeauty", name: "Glow Beauty Bar", cat: "Beauty", owner: "Aisha Rahman" },
    { username: "technova", name: "TechNova Solutions", cat: "Technology", owner: "Ravi Kumar" },
    { username: "fitzone", name: "FitZone Studio", cat: "Fitness", owner: "Sara Ng" },
  ];

  const businesses = [];
  for (const b of businessSeeds) {
    const user = await prisma.user.upsert({
      where: { email: `${b.username}@demo.konnect` },
      update: {},
      create: {
        email: `${b.username}@demo.konnect`,
        passwordHash: demoPassword,
        role: "BUSINESS",
        emailVerified: new Date(),
        points: 350,
        lifetimeEarned: 350,
        profile: {
          create: { username: b.username, fullName: b.owner, jobTitle: "Owner" },
        },
        membershipTier: "GOLD",
        membershipStatus: "ACTIVE",
        businessProfile: {
          create: {
            slug: b.username,
            name: b.name,
            ownerName: b.owner,
            description: `${b.name} — a trusted local business on Konnect.`,
            categoryId: categoryMap.get(b.cat),
            city: "Singapore",
            country: "SG",
            phone: "+6591234567",
            whatsapp: "+6591234567",
            email: `${b.username}@demo.konnect`,
            website: `https://${b.username}.example.com`,
            logoUrl: `https://picsum.photos/seed/${b.username}-logo/240/240`,
            coverUrl: `https://picsum.photos/seed/${b.username}-cover/1000/400`,
            verification: "VERIFIED",
            verifiedAt: new Date(),
          },
        },
      },
      include: { businessProfile: true },
    });
    businesses.push(user);
  }

  console.log("Seeding demo posts & comments...");
  for (const biz of businesses) {
    for (let p = 1; p <= 4; p++) {
      const imageCount = (p % 3) + 1;
      const post = await prisma.post.create({
        data: {
          authorId: biz.id,
          body: `Exciting update #${p} from ${biz.businessProfile?.name}! Come visit us this week. 🎉`,
          status: "PUBLISHED",
          ctaType: "WHATSAPP",
          ctaLabel: "Message us",
          ctaValue: "+6591234567",
          images: {
            create: Array.from({ length: imageCount }, (_, i) => ({
              url: `https://picsum.photos/seed/${biz.id}-${p}-${i}/900/900`,
              sortOrder: i,
            })),
          },
        },
      });
      for (let c = 0; c < 2; c++) {
        const commenter = users[(p + c) % users.length]!;
        await prisma.comment.create({
          data: {
            postId: post.id,
            authorId: commenter.id,
            body: "This looks great, congratulations on the launch!",
          },
        });
      }
      await prisma.post.update({
        where: { id: post.id },
        data: { commentCount: 2, likeCount: 3 },
      });
    }
  }

  console.log("Seeding demo awards...");
  const awardSeeds = [
    { name: "Top Entertainment 2026", cat: "Entertainment", featured: true },
    { name: "Best Customer Service 2026", cat: "Professional Services", featured: true },
    { name: "Top New Business 2026", cat: "Retail", featured: false },
    { name: "Community Choice 2026", cat: "Food & Beverage", featured: true },
  ];
  for (let i = 0; i < awardSeeds.length; i++) {
    const a = awardSeeds[i]!;
    const award = await prisma.award.upsert({
      where: { slug: slugify(a.name) },
      update: {},
      create: {
        name: a.name,
        slug: slugify(a.name),
        description: `Recognizing excellence in ${a.cat}.`,
        category: a.cat,
        year: 2026,
        featured: a.featured,
        active: true,
      },
    });
    const winner = businesses[i % businesses.length]!;
    if (winner.businessProfile) {
      await prisma.businessAward.upsert({
        where: {
          awardId_businessProfileId: {
            awardId: award.id,
            businessProfileId: winner.businessProfile.id,
          },
        },
        update: {},
        create: {
          awardId: award.id,
          businessProfileId: winner.businessProfile.id,
          rank: 1,
        },
      });
    }
  }

  console.log("Seeding demo rewards...");
  const rewards = [
    { title: "Free Coffee", pointsCost: 500, stock: 100, category: "Food & Beverage" },
    { title: "$10 Voucher", pointsCost: 1000, stock: 50, category: "Retail" },
    { title: "Free KTV Hour", pointsCost: 2000, stock: 20, category: "Entertainment" },
    { title: "Beauty Gift Set", pointsCost: 5000, stock: 10, category: "Beauty" },
    { title: "Fitness Day Pass", pointsCost: 800, stock: 40, category: "Fitness" },
  ];
  for (const r of rewards) {
    const existing = await prisma.reward.findFirst({ where: { title: r.title } });
    if (!existing) {
      await prisma.reward.create({
        data: {
          title: r.title,
          description: `Redeem your points for a ${r.title}.`,
          pointsCost: r.pointsCost,
          stock: r.stock,
          category: r.category,
          maxPerUser: 3,
          active: true,
        },
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
