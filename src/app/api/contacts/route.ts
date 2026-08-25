import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { addContact, listContacts, ContactError } from "@/lib/contacts";
import { handle, ok, Errors, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  username: z.string().min(1).max(80),
  source: z
    .enum(["MANUAL", "QR_SCAN", "SHARED_LINK", "NFC_CARD", "EVENT", "REFERRAL", "CARD_SIGNUP"])
    .optional(),
  sourceCardId: z.string().max(120).nullish(),
  eventId: z.string().max(120).nullish(),
  notes: z.string().max(2000).nullish(),
});

/** GET /api/contacts?search=&source=&sort= — the caller's own contact list. */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    const sp = req.nextUrl.searchParams;
    const sourceParam = sp.get("source");
    const rows = await listContacts(user.id, {
      search: sp.get("search") ?? undefined,
      source:
        sourceParam && ["MANUAL", "QR_SCAN", "SHARED_LINK", "NFC_CARD", "EVENT", "REFERRAL", "CARD_SIGNUP"].includes(sourceParam)
          ? (sourceParam as never)
          : undefined,
      sort: (["recent", "name", "company"] as const).includes(sp.get("sort") as never)
        ? (sp.get("sort") as "recent" | "name" | "company")
        : "recent",
    });
    return ok(rows);
  });
}

/**
 * POST /api/contacts — save a user by username into the caller's contacts.
 * Duplicate-safe and self-save-proof.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    enforceRateLimit(`contacts:create:${user.id}`, 60, 60 * 60 * 1000);

    const input = createSchema.parse(await req.json());

    const target = await prismaFindUserIdByUsername(input.username);
    if (!target) throw Errors.notFound("No BridgeX member with that username.");

    try {
      const contact = await addContact({
        ownerUserId: user.id,
        contactUserId: target,
        source: input.source ?? "MANUAL",
        sourceCardId: input.sourceCardId ?? null,
        eventId: input.eventId ?? null,
        notes: input.notes ?? null,
      });
      return ok(contact, { status: 201 });
    } catch (err) {
      if (err instanceof ContactError) {
        throw new ApiError(err.status, err.message, err.code);
      }
      throw err;
    }
  });
}

async function prismaFindUserIdByUsername(username: string): Promise<string | null> {
  const { prisma } = await import("@/lib/db/prisma");
  const profile = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
    select: { userId: true },
  });
  return profile?.userId ?? null;
}