import type { NextRequest } from "next/server";
import type { AnalyticsEventType } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { recordEvent } from "@/lib/analytics";
import { handle, ok, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

// Client-trackable interaction events (profile views are recorded server-side).
const TRACKABLE = [
  "PROFILE_SHARE",
  "QR_VIEW",
  "CONTACT_SAVE",
  "WHATSAPP_CLICK",
  "PHONE_CLICK",
  "EMAIL_CLICK",
  "WEBSITE_CLICK",
] as const;

const schema = z.object({
  type: z.enum(TRACKABLE),
  targetId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const ip = getClientIp(req);
    enforceRateLimit(`track:${ip}`, 120, 60 * 1000);

    const body = await req.json();
    const { type, targetId } = schema.parse(body);
    const user = await getCurrentUser();

    await recordEvent({
      type: type as AnalyticsEventType,
      userId: user?.id ?? null,
      targetId,
      ip,
    });
    return ok({ tracked: true });
  });
}
