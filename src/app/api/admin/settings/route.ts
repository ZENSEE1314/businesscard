import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getCheckinSettings,
  setSetting,
  getActivityThresholds,
  getCardRankingSettings,
  getAiSettings,
  getRateLimitSettings,
} from "@/lib/settings";
import { checkOllamaHealth, isAiProfileGenerationEnabled, getOllamaConfig } from "@/lib/ai/ollama";
import { handle, ok, Errors, getClientIp } from "@/lib/api";
import { logAdminAction } from "@/lib/admin-log";

export const dynamic = "force-dynamic";

const checkinSchema = z.object({
  enabled: z.boolean(),
  basePoints: z.number().int().min(0).max(10000),
  autoCheckInOnLogin: z.boolean(),
  streakBonusEnabled: z.boolean(),
  milestones: z
    .array(z.object({ day: z.number().int().min(1).max(365), bonus: z.number().int().min(0).max(10000) }))
    .max(10),
  maxDailyPoints: z.number().int().min(1).max(50000),
});

const thresholdsSchema = z.object({
  activeWithinDays: z.number().int().min(1).max(90),
  inactiveWithinDays: z.number().int().min(2).max(365),
}).refine((v) => v.activeWithinDays < v.inactiveWithinDays, {
  message: "Active threshold must be smaller than inactive threshold.",
});

const rankingSchema = z.object({
  enabled: z.boolean(),
  method: z.enum(["points", "activity", "membership", "connections"]),
  maxConnections: z.number().int().min(0).max(7),
});

const aiSchema = z.object({ enabled: z.boolean() });

const rateLimitSchema = z.object({
  emailFailuresAllowed: z.number().int().min(3).max(100),
  ipFailuresAllowed: z.number().int().min(5).max(1000),
  windowMinutes: z.number().int().min(1).max(1440),
});

const putSchema = z.object({
  dailyCheckIn: checkinSchema.optional(),
  activityThresholds: thresholdsSchema.optional(),
  cardRanking: rankingSchema.optional(),
  aiProfile: aiSchema.optional(),
  loginRateLimit: rateLimitSchema.optional(),
});

/** GET /api/admin/settings — all feature settings + AI reachability. */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    if (user.role !== "ADMIN") throw Errors.forbidden();

    const [dailyCheckIn, activityThresholds, cardRanking, aiProfile, loginRateLimit, ollama] =
      await Promise.all([
        getCheckinSettings(),
        getActivityThresholds(),
        getCardRankingSettings(),
        getAiSettings(),
        getRateLimitSettings(),
        checkOllamaHealth(),
      ]);

    const ollamaConfig = getOllamaConfig();
    return ok({
      dailyCheckIn,
      activityThresholds,
      cardRanking,
      aiProfile,
      loginRateLimit,
      ai: {
        envEnabled: isAiProfileGenerationEnabled(),
        model: ollamaConfig?.model ?? null,
        baseUrlConfigured: Boolean(ollamaConfig),
        reachable: ollama.reachable,
        detail: ollama.detail,
      },
    });
  });
}

/** PUT /api/admin/settings — update any subset of the settings. */
export async function PUT(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    if (user.role !== "ADMIN") throw Errors.forbidden();

    const input = putSchema.parse(await req.json());

    if (input.dailyCheckIn) await setSetting("dailyCheckIn", input.dailyCheckIn);
    if (input.activityThresholds) await setSetting("activityThresholds", input.activityThresholds);
    if (input.cardRanking) await setSetting("cardRanking", input.cardRanking);
    if (input.aiProfile) await setSetting("aiProfile", input.aiProfile);
    if (input.loginRateLimit) await setSetting("loginRateLimit", input.loginRateLimit);

    await logAdminAction({
      adminId: user.id,
      action: "settings.update",
      targetType: "settings",
      newValue: { updated: Object.keys(input) } as unknown as Parameters<typeof logAdminAction>[0]["newValue"],
      ip: getClientIp(req),
    });

    return ok({ updated: true });
  });
}