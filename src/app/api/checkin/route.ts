import { getCurrentUser } from "@/lib/auth/current-user";
import { claimDailyCheckIn, getCheckInStatus } from "@/lib/checkin";
import { handle, ok, Errors } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/checkin — current check-in status for the signed-in user. */
export async function GET() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    const status = await getCheckInStatus(user.id);
    return ok(status);
  });
}

/**
 * POST /api/checkin — claim today's reward.
 * Idempotent: repeated taps and concurrent requests return the same claim
 * without awarding points twice (DB unique constraint on user+localDate).
 */
export async function POST() {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();

    // Cheap abuse brake; the DB constraint is the real guarantee.
    enforceRateLimit(`checkin:${user.id}`, 10, 60 * 1000);

    const outcome = await claimDailyCheckIn(user.id);
    const status = await getCheckInStatus(user.id);
    return ok({ ...outcome, status });
  });
}