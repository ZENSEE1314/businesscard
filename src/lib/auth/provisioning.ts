import "server-only";
import { prisma } from "@/lib/db/prisma";
import { slugify, isReservedSlug } from "@/lib/utils";

function baseFrom(input: string): string {
  const s = slugify(input).replace(/-/g, "");
  return s.length >= 3 ? s.slice(0, 24) : `member${Math.floor(Math.random() * 1000)}`;
}

// Produces a unique, non-reserved profile username derived from a seed string.
export async function generateUniqueUsername(seed: string): Promise<string> {
  let base = baseFrom(seed);
  if (isReservedSlug(base)) base = `${base}1`;

  let candidate = base;
  let n = 0;
  // Loop until we find a free username. Suffix grows with collisions.
  // Bounded in practice by the tiny probability of many collisions.
  while (await prisma.profile.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}`;
    if (n > 50) {
      candidate = `${base}${Date.now().toString().slice(-5)}`;
      break;
    }
  }
  return candidate;
}

// Produces a unique business slug derived from the business name.
export async function generateUniqueBusinessSlug(name: string): Promise<string> {
  let base = slugify(name);
  if (base.length < 3) base = `business-${Math.floor(Math.random() * 1000)}`;
  if (isReservedSlug(base)) base = `${base}-biz`;

  let candidate = base;
  let n = 0;
  while (
    await prisma.businessProfile.findUnique({ where: { slug: candidate } })
  ) {
    n += 1;
    candidate = `${base}-${n}`;
    if (n > 50) {
      candidate = `${base}-${Date.now().toString().slice(-5)}`;
      break;
    }
  }
  return candidate;
}
