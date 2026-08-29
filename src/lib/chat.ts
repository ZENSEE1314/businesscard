import "server-only";
import { prisma } from "@/lib/db/prisma";

// In-app messaging over the Conversation / ConversationMember / Message models.
// BridgeX only supports direct (1:1) conversations today; the group scaffolding
// (isGroup) already exists in the schema for future use.

export class ChatError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const memberUserSelect = {
  id: true,
  status: true,
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
} as const;

export interface DirectConversationPartner {
  id: string;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  subtitle: string | null;
}

export interface ConversationListItem {
  id: string;
  lastMessageAt: Date;
  unread: number;
  partner: DirectConversationPartner;
  lastMessage: { body: string | null; senderId: string; createdAt: Date } | null;
}

export interface ChatThreadMessage {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  senderName: string;
}

/** Resolves a profile username or business slug to the member behind it. */
export async function resolveHandleToUserId(handle: string): Promise<string | null> {
  const key = handle.trim().toLowerCase();
  if (!key) return null;
  const profile = await prisma.profile.findUnique({
    where: { username: key },
    select: { userId: true },
  });
  if (profile) return profile.userId;
  const business = await prisma.businessProfile.findUnique({
    where: { slug: key },
    select: { userId: true },
  });
  return business?.userId ?? null;
}

/**
 * Finds or creates the 1:1 conversation between two users. Idempotent:
 * re-opening the same pair always returns the same conversation.
 */
export async function findOrCreateDirectConversation(
  userAId: string,
  userBId: string,
): Promise<{ id: string; created: boolean }> {
  if (userAId === userBId) {
    throw new ChatError(400, "You cannot message yourself.", "self_message");
  }

  const target = await prisma.user.findUnique({
    where: { id: userBId },
    select: { id: true, status: true },
  });
  if (!target || target.status !== "ACTIVE") {
    throw new ChatError(404, "That member does not exist.", "not_found");
  }

  // Exactly the two members: both present, nobody else.
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { members: { some: { userId: userAId } } },
        { members: { some: { userId: userBId } } },
        { members: { every: { userId: { in: [userAId, userBId] } } } },
      ],
    },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: { create: [{ userId: userAId }, { userId: userBId }] },
    },
    select: { id: true },
  });
  return { id: conversation.id, created: true };
}

/** Opens (or finds) a direct conversation with a username / business slug. */
export async function openDirectConversationByHandle(
  handle: string,
  meId: string,
): Promise<string | null> {
  const targetId = await resolveHandleToUserId(handle);
  if (!targetId) return null;
  const { id } = await findOrCreateDirectConversation(meId, targetId);
  return id;
}

function partnerFromUser(user: {
  id: string;
  profile: {
    username: string | null;
    fullName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    jobTitle: string | null;
    companyName: string | null;
  } | null;
}): DirectConversationPartner {
  return {
    id: user.id,
    username: user.profile?.username ?? null,
    name:
      user.profile?.displayName ||
      user.profile?.fullName ||
      user.profile?.companyName ||
      "Member",
    avatarUrl: user.profile?.avatarUrl ?? null,
    subtitle:
      [user.profile?.jobTitle, user.profile?.companyName]
        .filter(Boolean)
        .join(" · ") || null,
  };
}

/** All direct conversations for the user, newest activity first. */
export async function listConversations(
  meId: string,
): Promise<ConversationListItem[]> {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: meId },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: memberUserSelect } } },
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, senderId: true, createdAt: true },
          },
        },
      },
    },
  });

  const rows = memberships
    .map((m) => {
      const other = m.conversation.members.find((x) => x.userId !== meId);
      const partner =
        other && other.user && other.user.status === "ACTIVE"
          ? partnerFromUser(other.user)
          : null;
      return {
        membership: m,
        conversation: m.conversation,
        partner,
        lastMessage: m.conversation.messages[0] ?? null,
      };
    })
    .filter((r): r is (typeof r) & { partner: DirectConversationPartner } =>
      Boolean(r.partner),
    )
    .sort(
      (a, b) =>
        b.conversation.lastMessageAt.getTime() -
        a.conversation.lastMessageAt.getTime(),
    );

  return Promise.all(
    rows.map(async (r) => {
      const unread = await prisma.message.count({
        where: {
          conversationId: r.conversation.id,
          deletedAt: null,
          senderId: { not: meId },
          ...(r.membership.lastReadAt
            ? { createdAt: { gt: r.membership.lastReadAt } }
            : {}),
        },
      });
      return {
        id: r.conversation.id,
        lastMessageAt: r.conversation.lastMessageAt,
        unread,
        partner: r.partner,
        lastMessage: r.lastMessage,
      };
    }),
  );
}

/** Loads a conversation after verifying the user is a member of it. */
export async function getConversationForUser(
  conversationId: string,
  meId: string,
) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: meId } },
    select: { id: true },
  });
  if (!membership) {
    throw new ChatError(404, "Conversation not found.", "not_found");
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: { include: { user: { select: memberUserSelect } } } },
  });
  if (!conversation) {
    throw new ChatError(404, "Conversation not found.", "not_found");
  }

  const otherMember = conversation.members.find((m) => m.userId !== meId);
  const partner =
    otherMember && otherMember.user && otherMember.user.status === "ACTIVE"
      ? partnerFromUser(otherMember.user)
      : null;
  return { partner };
}

export async function listMessages(
  conversationId: string,
  opts: { after?: Date; limit?: number } = {},
): Promise<ChatThreadMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
      body: { not: null },
      ...(opts.after ? { createdAt: { gt: opts.after } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: opts.limit ?? 300,
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
      sender: {
        select: {
          profile: { select: { fullName: true, displayName: true } },
        },
      },
    },
  });
  return messages.map((m) => ({
    id: m.id,
    body: m.body as string,
    createdAt: m.createdAt,
    senderId: m.senderId,
    senderName:
      m.sender.profile?.displayName || m.sender.profile?.fullName || "Member",
  }));
}

export async function markConversationRead(
  conversationId: string,
  meId: string,
) {
  await prisma.conversationMember.updateMany({
    where: { conversationId, userId: meId },
    data: { lastReadAt: new Date() },
  });
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  rawBody: string,
): Promise<ChatThreadMessage> {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    throw new ChatError(400, "Message cannot be empty.", "empty_message");
  }
  if (trimmed.length > 4000) {
    throw new ChatError(
      400,
      "Message is too long (max 4000 characters).",
      "message_too_long",
    );
  }

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
    select: { id: true },
  });
  if (!membership) {
    throw new ChatError(404, "Conversation not found.", "not_found");
  }

  const message = await prisma.message.create({
    data: { conversationId, senderId, body: trimmed },
    select: { id: true, body: true, createdAt: true, senderId: true },
  });

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: message.createdAt },
    }),
    // The sender has obviously read their own message.
    prisma.conversationMember.updateMany({
      where: { conversationId, userId: senderId },
      data: { lastReadAt: message.createdAt },
    }),
  ]);

  return {
    id: message.id,
    body: message.body as string,
    createdAt: message.createdAt,
    senderId: message.senderId,
    senderName: "You",
  };
}