import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAiSettings } from "@/lib/settings";
import {
  generateProfileContent,
  isAiProfileGenerationEnabled,
  OllamaError,
  type AiLanguage,
} from "@/lib/ai/ollama";
import { handle, ok, Errors, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const inputSchema = z.object({
  fullName: z.string().max(120).optional(),
  jobTitle: z.string().max(120).optional(),
  company: z.string().max(120).optional(),
  industry: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  businessDescription: z.string().max(2000).optional(),
  products: z.array(z.string().max(120)).max(20).optional(),
  services: z.array(z.string().max(120)).max(20).optional(),
  expertise: z.array(z.string().max(120)).max(20).optional(),
  businessGoals: z.string().max(1000).optional(),
  idealCustomers: z.array(z.string().max(120)).max(20).optional(),
  desiredDistributors: z.array(z.string().max(120)).max(20).optional(),
  desiredSuppliers: z.array(z.string().max(120)).max(20).optional(),
  desiredInvestors: z.array(z.string().max(120)).max(20).optional(),
  desiredPartners: z.array(z.string().max(120)).max(20).optional(),
  language: z.enum(["en", "id", "zh"]).optional(),
});

/**
 * POST /api/ai/profile — server-side proxy to the Railway Ollama service.
 * Auth required, per-user rate limited, keys never leave the server.
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    // Master switches: env flag AND admin setting.
    const aiSetting = await getAiSettings();
    if (!isAiProfileGenerationEnabled() || !aiSetting.enabled) {
      throw new ApiError(
        503,
        "AI profile generation is currently unavailable.",
        "ai_disabled",
      );
    }

    // Reasonable per-user limit that does not block genuine use.
    enforceRateLimit(`ai:profile:${user.id}`, 10, 10 * 60 * 1000);

    const input = inputSchema.parse(await req.json());

    try {
      const content = await generateProfileContent(input as {
        language?: AiLanguage;
      });
      return ok(content);
    } catch (err) {
      if (err instanceof OllamaError) {
        throw new ApiError(err.status, err.message, err.code);
      }
      throw err;
    }
  });
}