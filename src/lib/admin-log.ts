import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Every privileged mutation flows through here so the admin log at
 * /admin/logs answers "who changed what, when, from where".
 *
 * `oldValue` / `newValue` are optional JSON snapshots (e.g. before/after of a
 * profile edit) and `targetUsername` is denormalised so the log stays readable
 * even after the target row is deleted.
 */
export async function logAdminAction(input: {
  adminId: string;
  action: string; // e.g. "user.update" — see /admin/logs legend
  targetType: string; // user | award | withdrawal | event | membership | settings | ...
  targetId?: string | null;
  targetUsername?: string | null;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.adminLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        targetUsername: input.targetUsername ?? null,
        oldValue: input.oldValue ?? undefined,
        newValue: input.newValue ?? undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    // Logging must never break the actual admin operation.
    console.error("admin log write failed:", err);
  }
}
