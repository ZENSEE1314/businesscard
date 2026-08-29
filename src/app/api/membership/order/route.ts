import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/permissions/guards";
import { createMembershipOrder } from "@/features/membership/service";
import { getMembershipBank } from "@/lib/settings";
import { formatIdr } from "@/lib/membership";
import { handle, created, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ tier: z.enum(["BRIDGEMAKER", "BRIDGEMASTER"]) });

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    enforceRateLimit(`membership:${user.id}:${getClientIp(req)}`, 10, 60 * 60 * 1000);

    const { tier } = schema.parse(await req.json());
    const order = await createMembershipOrder(user.id, tier);
    const bank = await getMembershipBank();

    return created({
      order: {
        id: order.id,
        tier: order.tier,
        orderCode: order.orderCode,
        priceIdr: order.priceIdr,
        priceLabel: formatIdr(order.priceIdr),
        status: order.status,
      },
      bank,
    });
  });
}
