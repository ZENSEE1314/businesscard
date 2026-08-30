import "server-only";
import { Prisma, type ContactSource } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// In-app business contact management. A Contact row is a relationship between
// two users — deleting it never touches user accounts or the phone address
// book (the .vcf download is a separate, standards-compliant flow).

export class ContactError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface AddContactInput {
  ownerUserId: string;
  contactUserId: string;
  source?: ContactSource;
  sourceCardId?: string | null;
  eventId?: string | null;
  notes?: string | null;
}

/**
 * Saves targetUser into owner's contact list.
 *  - Self-saving is rejected.
 *  - Duplicates are idempotent: re-saving returns the existing row.
 * Ownership is enforced by the caller passing the authenticated ownerUserId.
 */
export async function addContact(input: AddContactInput) {
  const { ownerUserId, contactUserId } = input;
  if (ownerUserId === contactUserId) {
    throw new ContactError(400, "You cannot save yourself as a contact.", "self_contact");
  }

  const target = await prisma.user.findUnique({
    where: { id: contactUserId },
    select: { id: true, status: true },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new ContactError(404, "That user does not exist.", "not_found");
  }

  try {
    return await prisma.contact.create({
      data: {
        ownerUserId,
        contactUserId,
        source: input.source ?? "MANUAL",
        sourceCardId: input.sourceCardId ?? null,
        eventId: input.eventId ?? null,
        notes: input.notes ?? null,
      },
      include: {
        contact: {
          select: {
            id: true,
            profile: {
              select: {
                username: true,
                fullName: true,
                displayName: true,
                avatarUrl: true,
                jobTitle: true,
                companyName: true,
              },
            },
          },
        },
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Duplicate pair — return the existing relationship untouched.
      return prisma.contact.findUnique({
        where: { ownerUserId_contactUserId: { ownerUserId, contactUserId } },
        include: {
          contact: {
            select: {
              id: true,
              profile: {
                select: {
                  username: true,
                  fullName: true,
                  displayName: true,
                  avatarUrl: true,
                  jobTitle: true,
                  companyName: true,
                },
              },
            },
          },
        },
      });
    }
    throw err;
  }
}

/** Deletes a contact the caller owns. Throws 404 when not found / not owned. */
export async function removeContact(ownerUserId: string, contactId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, ownerUserId: true },
  });
  if (!existing || existing.ownerUserId !== ownerUserId) {
    throw new ContactError(404, "Contact not found in your list.", "not_found");
  }
  await prisma.contact.delete({ where: { id: contactId } });
}

export interface ListContactsOptions {
  search?: string;
  source?: ContactSource;
  category?: string;
  sort?: "recent" | "name" | "company";
}

const contactCardSelect = {
  id: true,
  source: true,
  notes: true,
  category: true,
  createdAt: true,
  contactUserId: true,
  contact: {
    select: {
      id: true,
      status: true,
      createdAt: true,
      points: true,
      membershipTier: true,
      profile: {
        select: {
          username: true,
          fullName: true,
          displayName: true,
          avatarUrl: true,
          jobTitle: true,
          companyName: true,
          city: true,
          country: true,
        },
      },
    },
  },
} satisfies Prisma.ContactSelect;

export type ContactListRow = Prisma.ContactGetPayload<{
  select: typeof contactCardSelect;
}>;

export async function listContacts(
  ownerUserId: string,
  opts: ListContactsOptions = {},
): Promise<ContactListRow[]> {
  const where: Prisma.ContactWhereInput = {
    ownerUserId,
    contact: { status: "ACTIVE" }, // hide deleted/deactivated accounts
  };
  if (opts.source) where.source = opts.source;
  if (opts.category && opts.category.trim()) where.category = opts.category.trim();
  if (opts.search && opts.search.trim()) {
    const q = opts.search.trim();
    where.OR = [
      { contact: { profile: { fullName: { contains: q, mode: "insensitive" } } } },
      { contact: { profile: { displayName: { contains: q, mode: "insensitive" } } } },
      { contact: { profile: { companyName: { contains: q, mode: "insensitive" } } } },
      { contact: { profile: { jobTitle: { contains: q, mode: "insensitive" } } } },
      { contact: { profile: { username: { contains: q, mode: "insensitive" } } } },
      { contact: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  let orderBy: Prisma.ContactOrderByWithRelationInput = { createdAt: "desc" };
  if (opts.sort === "name") {
    orderBy = { contact: { profile: { fullName: "asc" } } };
  } else if (opts.sort === "company") {
    orderBy = { contact: { profile: { companyName: "asc" } } };
  }

  return prisma.contact.findMany({
    where,
    orderBy,
    select: contactCardSelect,
  });
}

export async function getContactByUsername(ownerUserId: string, username: string) {
  return prisma.contact.findFirst({
    where: {
      ownerUserId,
      contact: { profile: { username: username.toLowerCase() } },
    },
    select: contactCardSelect,
  });
}