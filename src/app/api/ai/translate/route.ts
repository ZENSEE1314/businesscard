import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAiSettings } from "@/lib/settings";
import {
  translateText,
  isAiProfileGenerationEnabled,
  OllamaError,
} from "@/lib/ai/ollama";
import { handle, ok, Errors, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  text: z.string().min(1).max(6000),
  target: z.string().min(2).max(8),
});

/**
 * POST /api/ai/translate — translate text into the viewer's chosen language.
 * Used by the Translate button on posts, comments, events and marketplace.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    const aiSetting = await getAiSettings();
    if (!isAiProfileGenerationEnabled() || !aiSetting.enabled) {
      throw new ApiError(503, "Translation is unavailable right now.", "ai_disabled");
    }

    enforceRateLimit(`ai:translate:${user.id}`, 60, 10 * 60 * 1000);

    const input = schema.parse(await req.json());

    try {
      const text = await translateText(input.text, input.target);
      return ok({ text });
    } catch (err) {
      if (err instanceof OllamaError) throw new ApiError(err.status, err.message, err.code);
      throw err;
    }
  });
}
