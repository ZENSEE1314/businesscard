import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  "user.role_status": "Changed role/status",
  "user.role": "Changed role",
  "user.status": "Changed status",
  "user.profile": "Edited profile",
  "user.email": "Changed email",
  "user.delete": "Deleted user",
  "award.create": "Created award",
  "award.update": "Edited award",
  "award.delete": "Deleted award",
  "membership.approve": "Approved membership",
  "membership.reject": "Rejected membership",
  "withdrawal.approve": "Approved withdrawal",
  "withdrawal.reject": "Rejected withdrawal",
  "withdrawal.paid": "Marked withdrawal paid",
  "referral.commission": "Recorded commission",
  "tree.reassign": "Reassigned referral tree",
  "post.moderate": "Moderated post",
  "settings.update": "Updated settings",
};

function preview(v: unknown): string {
  if (v == null) return "—";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default async function AdminLogsPage() {
  const rows = await prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: {
      admin: { select: { email: true, profile: { select: { fullName: true } } } },
    },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Admin log</h1>
      <p className="mb-4 text-sm text-muted">
        Every admin change to users, awards, memberships, withdrawals and settings —
        who did it, when, and what changed.
      </p>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No admin actions logged yet.</Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((l) => (
            <li key={l.id}>
              <Card className="p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold">
                      {ACTION_LABEL[l.action] ?? l.action}
                    </span>
                    {l.targetUsername && (
                      <span className="text-muted"> · {l.targetUsername}</span>
                    )}
                    <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                      {l.targetType}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {l.admin.profile?.fullName ?? l.admin.email}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {new Date(l.createdAt).toLocaleString("en", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {l.ip ? ` · ${l.ip}` : ""}
                </p>
                {(l.oldValue || l.newValue) && (
                  <div className="mt-2 grid gap-1 rounded-lg bg-surface-2 p-2 font-mono text-[11px] text-muted sm:grid-cols-2">
                    <div>before: {preview(l.oldValue)}</div>
                    <div>after: {preview(l.newValue)}</div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
