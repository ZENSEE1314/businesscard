import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  listMessages,
  sendMessage,
  markConversationRead,
  ChatError,
} from "@/lib/chat";
import { handle, ok, Errors, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const sendSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

/**
 * GET /api/chat/conversations/:id/messages?after=ISO
 * Polls for messages (optionally only those newer than `after`).
 * Viewing the thread marks it read for the caller.
 */
export async function GET(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;

    const afterParam = req.nextUrl.searchParams.get("after");
    let after: Date | undefined;
    if (afterParam) {
      const t = Date.parse(afterParam);
      if (Number.isNaN(t)) {
        throw Errors.badRequest("Invalid `after` timestamp.");
      }
      after = new Date(t);
    }

    try {
      await markConversationRead(id, user.id);
      const messages = await listMessages(id, { after });
      return ok({ messages });
    } catch (err) {
      if (err instanceof ChatError) {
        throw new ApiError(err.status, err.message, err.code);
      }
      throw err;
    }
  });
}

/** POST /api/chat/conversations/:id/messages — send a text message. */
export async function POST(req: NextRequest, { params }: Params) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const { id } = await params;
    enforceRateLimit(`chat:send:${user.id}`, 90, 60 * 1000);

    const input = sendSchema.parse(await req.json());
    try {
      const message = await sendMessage(id, user.id, input.body);
      return ok({ message }, { status: 201 });
    } catch (err) {
      if (err instanceof ChatError) {
        throw new ApiError(err.status, err.message, err.code);
      }
      throw err;
    }
  });
}