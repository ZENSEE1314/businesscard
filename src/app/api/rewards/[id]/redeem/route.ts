import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/permissions/guards";
import { redeemReward } from "@/features/rewards/redeem";
import { handle, ok, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const user = await requireUser();
    enforceRateLimit(`redeem:${user.id}:${getClientIp(req)}`, 20, 60 * 60 * 1000);
    const { id } = await params;

    const result = await redeemReward(user.id, id);
    return ok(result);
  });
}
