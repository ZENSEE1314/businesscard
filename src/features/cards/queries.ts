import "server-only";
import { prisma } from "@/lib/db/prisma";
import { absoluteUrl, normalizePhone, whatsappNumber } from "@/lib/utils";

export interface Social {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  linkedin?: string | null;
  telegram?: string | null;
  twitter?: string | null;
}

export interface CardView {
  kind: "personal" | "business";
  userId: string;
  handle: string; // username or slug
  path: string; // /u/x or /business/x
  profileUrl: string;
  name: string;
  subtitle?: string | null; // jobTitle or category
  org?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  verified: boolean;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  city?: string | null;
  country?: string | null;
  socials: Social;
  awards: { name: string; year: number | null }[];
  isBusiness: boolean;
}

function pickSocials(p: Social): Social {
  return {
    instagram: p.instagram,
    facebook: p.facebook,
    tiktok: p.tiktok,
    linkedin: p.linkedin,
    telegram: p.telegram,
    twitter: p.twitter,
  };
}

export async function getPersonalCard(username: string): Promise<CardView | null> {
  const profile = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
    include: { user: { select: { id: true, status: true, role: true } } },
  });
  if (!profile || profile.user.status !== "ACTIVE") return null;

  return {
    kind: "personal",
    userId: profile.userId,
    handle: profile.username,
    path: `/u/${profile.username}`,
    profileUrl: absoluteUrl(`/u/${profile.username}`),
    name: profile.displayName || profile.fullName,
    subtitle: profile.jobTitle,
    org: profile.companyName,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    bio: profile.bio,
    verified: false,
    phone: profile.showPhone ? normalizePhone(profile.phone) : null,
    whatsapp: profile.showWhatsapp ? normalizePhone(profile.whatsapp) : null,
    email: profile.showEmail ? profile.email : null,
    website: profile.website,
    address: profile.showAddress ? profile.address : null,
    mapUrl: null,
    city: profile.city,
    country: profile.country,
    socials: pickSocials(profile),
    awards: [],
    isBusiness: profile.user.role === "BUSINESS",
  };
}

export async function getBusinessCard(slug: string): Promise<CardView | null> {
  const biz = await prisma.businessProfile.findUnique({
    where: { slug: slug.toLowerCase() },
    include: {
      user: { select: { id: true, status: true } },
      category: { select: { name: true } },
      awards: {
        include: { award: { select: { name: true, year: true } } },
      },
    },
  });
  if (!biz || biz.user.status !== "ACTIVE") return null;

  return {
    kind: "business",
    userId: biz.userId,
    handle: biz.slug,
    path: `/business/${biz.slug}`,
    profileUrl: absoluteUrl(`/business/${biz.slug}`),
    name: biz.name,
    subtitle: biz.category?.name,
    org: biz.showOwner ? biz.ownerName : null,
    avatarUrl: biz.logoUrl,
    coverUrl: biz.coverUrl,
    bio: biz.description,
    verified: biz.verification === "VERIFIED",
    phone: normalizePhone(biz.phone),
    whatsapp: normalizePhone(biz.whatsapp),
    email: biz.email,
    website: biz.website,
    address: biz.address,
    mapUrl: biz.mapUrl,
    city: biz.city,
    country: biz.country,
    socials: pickSocials(biz),
    awards: biz.awards.map((a) => ({ name: a.award.name, year: a.award.year })),
    isBusiness: true,
  };
}

// Convenience: contact action links derived from a card.
export function cardLinks(card: CardView) {
  const wa = whatsappNumber(card.whatsapp);
  return {
    whatsapp: wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(
          `Hi ${card.name}, I found your profile on Konnect.`,
        )}`
      : null,
    tel: card.phone ? `tel:${card.phone}` : null,
    mailto: card.email ? `mailto:${card.email}` : null,
    website: card.website
      ? card.website.startsWith("http")
        ? card.website
        : `https://${card.website}`
      : null,
  };
}
