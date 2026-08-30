import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAiSettings } from "@/lib/settings";
import {
  generateProfileField,
  rewriteText,
  isAiProfileGenerationEnabled,
  OllamaError,
  type WriteField,
} from "@/lib/ai/ollama";
import { handle, ok, Errors, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const contextSchema = z
  .object({
    fullName: z.string().max(120).optional(),
    jobTitle: z.string().max(120).optional(),
    company: z.string().max(120).optional(),
    industry: z.string().max(120).optional(),
    location: z.string().max(120).optional(),
    businessDescription: z.string().max(2000).optional(),
    products: z.array(z.string().max(120)).max(20).optional(),
    services: z.array(z.string().max(120)).max(20).optional(),
    expertise: z.array(z.string().max(120)).max(20).optional(),
  })
  .optional();

const schema = z.object({
  mode: z.enum(["generate", "rewrite"]),
  field: z
    .enum(["bio", "whoIAm", "whatICanOffer", "whoIWantToFind", "headline"])
    .optional(),
  draft: z.string().max(4000).optional(),
  text: z.string().max(4000).optional(),
  tone: z.string().max(60).optional(),
  language: z.string().max(8).optional(),
  context: contextSchema,
});

/**
 * POST /api/ai/text — write or rewrite a single piece of profile / user text.
 * Auth required, per-user rate limited. Facts-only generation (no fabrication).
 */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    const aiSetting = await getAiSettings();
    if (!isAiProfileGenerationEnabled() || !aiSetting.enabled) {
      throw new ApiError(
        503,
        !aiSetting.enabled
          ? "AI writing is turned off in admin settings."
          : "AI is not configured yet. The administrator needs to set the AI provider in the service variables.",
        "ai_disabled",
      );
    }

    enforceRateLimit(`ai:text:${user.id}`, 20, 10 * 60 * 1000);

    const input = schema.parse(await req.json());

    try {
      let text: string;
      if (input.mode === "rewrite") {
        if (!input.text?.trim()) throw Errors.badRequest("Provide text to rewrite.");
        text = await rewriteText({
          text: input.text,
          tone: input.tone,
          language: input.language,
        });
      } else {
        if (!input.field) throw Errors.badRequest("Provide a field to write.");
        if (!input.draft?.trim() && !input.context) {
          throw Errors.badRequest(
            "Add a draft or some profile details for the AI to work from.",
          );
        }
        text = await generateProfileField({
          field: input.field as WriteField,
          draft: input.draft,
          context: input.context,
          language: input.language,
        });
      }
      return ok({ text });
    } catch (err) {
      if (err instanceof OllamaError) throw new ApiError(err.status, err.message, err.code);
      throw err;
    }
  });
}
