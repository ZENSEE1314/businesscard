import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [users, businesses, pendingMemberships, activeMemberships, posts] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "BUSINESS" } }),
      prisma.membership.count({ where: { status: "PENDING" } }),
      prisma.membership.count({ where: { status: "ACTIVE" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
    ]);

  const stats = [
    { label: "Total users", value: users },
    { label: "Business members", value: businesses },
    { label: "Active memberships", value: activeMemberships },
    { label: "Pending orders", value: pendingMemberships, href: "/admin/memberships" },
    { label: "Published posts", value: posts },
  ];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Overview</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const inner = (
            <Card className="p-5">
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </Card>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </div>
      {pendingMemberships > 0 && (
        <p className="mt-4 text-sm">
          <Link href="/admin/memberships" className="font-medium text-primary">
            {pendingMemberships} membership order(s) awaiting review →
          </Link>
        </p>
      )}
    </div>
  );
}
