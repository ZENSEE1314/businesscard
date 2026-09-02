import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isPaidMember } from "@/features/events/queries";
import {
  marketplaceCreateSchema,
  OPPORTUNITY_SECTIONS,
} from "@/lib/validation/marketplace";
import { Errors, handle, ok, created } from "@/lib/api";

/** GET — active listings, newest first. `?section=` filters to one section. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const sectionParam = req.nextUrl.searchParams.get("section");
    const section =
      sectionParam && (OPPORTUNITY_SECTIONS as readonly string[]).includes(sectionParam)
        ? (sectionParam as (typeof OPPORTUNITY_SECTIONS)[number])
        : null;

    const rows = await prisma.marketplaceListing.findMany({
      where: { active: true, ...(section ? { section } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        section: true,
        priceNote: true,
        imageUrl: true,
        whatsapp: true,
        createdAt: true,
        user: {
          select: {
            membershipTier: true,
            profile: { select: { username: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    return ok({ listings: rows });
  });
}

/** POST — paid members (BridgeMaker / BridgeMaster) post a listing. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    if (!(await isPaidMember(user.id))) {
      throw Errors.forbidden(
        "Only paid members (BridgeMaker / BridgeMaster) can post business opportunities.",
      );
    }
    const input = marketplaceCreateSchema.parse(await req.json());

    const listing = await prisma.marketplaceListing.create({
      data: {
        userId: user.id,
        title: input.title,
        description: input.description || null,
        category: input.category || null,
        section: input.section,
        priceNote: input.priceNote || null,
        imageUrl: input.imageUrl || null,
        whatsapp: input.whatsapp || null,
      },
      select: { id: true },
    });
    return created({ id: listing.id });
  });
}
