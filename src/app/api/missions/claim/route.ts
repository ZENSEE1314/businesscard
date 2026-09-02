import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  claimMissionReward,
  ALL_MISSIONS_BONUS_KEY,
  MISSION_KEYS,
  MissionError,
} from "@/lib/missions";
import { handle, ok, Errors } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  missionKey: z.enum([...MISSION_KEYS, ALL_MISSIONS_BONUS_KEY]),
});

/** POST /api/missions/claim — claim a weekly mission reward (idempotent). */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    enforceRateLimit(`missions:${user.id}`, 20, 60 * 1000);

    const { missionKey } = schema.parse(await req.json());
    try {
      const result = await claimMissionReward(user.id, missionKey);
      return ok(result);
    } catch (err) {
      if (err instanceof MissionError) {
        throw Errors.badRequest(err.message);
      }
      throw err;
    }
  });
}
