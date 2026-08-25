import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { removeContact, ContactError } from "@/lib/contacts";
import { prisma } from "@/lib/db/prisma";
import { handle, ok, Errors, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  notes: z.string().max(2000).nullable(),
});

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/contacts/:id — update private notes on the caller's own contact.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;
    const input = patchSchema.parse(await req.json());

    const existing = await prisma.contact.findUnique({
      where: { id },
      select: { ownerUserId: true },
    });
    if (!existing || existing.ownerUserId !== user.id) {
      throw Errors.notFound("Contact not found in your list.");
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: { notes: input.notes },
    });
    return ok(updated);
  });
}

/**
 * DELETE /api/contacts/:id — remove a contact from the caller's own list.
 * Only removes the in-app relationship; never touches user accounts or the
 * phone address book.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;

    try {
      await removeContact(user.id, id);
      return ok({ deleted: true });
    } catch (err) {
      if (err instanceof ContactError) {
        throw new ApiError(err.status, err.message, err.code);
      }
      throw err;
    }
  });
}