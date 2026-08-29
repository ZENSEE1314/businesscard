import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  findOrCreateDirectConversation,
  resolveHandleToUserId,
  ChatError,
} from "@/lib/chat";
import { prisma } from "@/lib/db/prisma";
import { handle, ok, Errors, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  username: z.string().min(1).max(120),
});

/**
 * POST /api/chat/conversations — find or open a 1:1 conversation with a
 * member (by profile username or business slug). Idempotent.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    enforceRateLimit(`chat:start:${user.id}`, 30, 60 * 60 * 1000);

    const input = startSchema.parse(await req.json());
    const targetId = await resolveHandleToUserId(input.username);
    if (!targetId) {
      throw Errors.notFound("No BridgeX member with that username.");
    }

    try {
      const result = await findOrCreateDirectConversation(user.id, targetId);
      if (result.created) {
        // Analytics: a new conversation was started with this member.
        await prisma.analyticsEvent.create({
          data: { type: "MESSAGE_START", userId: user.id, targetId },
        });
      }
      return ok(
        { conversationId: result.id },
        { status: result.created ? 201 : 200 },
      );
    } catch (err) {
      if (err instanceof ChatError) {
        throw new ApiError(err.status, err.message, err.code);
      }
      throw err;
    }
  });
}