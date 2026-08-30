import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/permissions/guards";
import { handle, ok } from "@/lib/api";

// Admin search for award recipients — matches members by name, username or
// company, and returns their company (business) profile so the admin can see
// who they're awarding.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireAdmin();
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

    // Empty query lists all members (newest first) so the admin sees everyone
    // without having to search; a query filters by name / username / company.
    const profiles = await prisma.profile.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      take: q ? 25 : 500,
      orderBy: q ? { fullName: "asc" } : { createdAt: "desc" },
      select: {
        username: true,
        fullName: true,
        avatarUrl: true,
        jobTitle: true,
        companyName: true,
        user: {
          select: {
            id: true,
            membershipTier: true,
            businessProfile: {
              select: {
                slug: true,
                name: true,
                logoUrl: true,
                verification: true,
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const results = profiles.map((p) => ({
      userId: p.user.id,
      username: p.username,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl,
      jobTitle: p.jobTitle,
      companyName: p.companyName,
      membershipTier: p.user.membershipTier,
      business: p.user.businessProfile
        ? {
            slug: p.user.businessProfile.slug,
            name: p.user.businessProfile.name,
            logoUrl: p.user.businessProfile.logoUrl,
            category: p.user.businessProfile.category?.name ?? null,
            verified: p.user.businessProfile.verification === "VERIFIED",
          }
        : null,
      // The handle used to assign: business slug if they have one, else username.
      handle: p.user.businessProfile?.slug ?? p.username,
    }));

    return ok({ results });
  });
}
