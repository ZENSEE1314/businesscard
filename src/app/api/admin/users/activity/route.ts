import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { queryActivityRows, activityRowsToCsv } from "@/features/admin/activity";
import type { ActivityFilters } from "@/features/admin/activity";
import { handle, Errors } from "@/lib/api";

export const dynamic = "force-dynamic";

function parseFilters(req: NextRequest): ActivityFilters {
  const sp = req.nextUrl.searchParams;
  const num = (key: string) => {
    const v = Number(sp.get(key));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };
  return {
    search: sp.get("search") ?? undefined,
    status: (sp.get("status") ?? "") as ActivityFilters["status"],
    tier: (sp.get("tier") ?? "") as ActivityFilters["tier"],
    joinedWithinDays: num("joinedWithinDays"),
    loginRecencyDays: num("loginRecencyDays"),
    sort: (sp.get("sort") ?? "recent_login") as ActivityFilters["sort"],
    page: num("page") ?? 1,
    pageSize: Math.min(200, num("pageSize") ?? 25),
  };
}

/**
 * GET /api/admin/users/activity?format=csv — CSV export of the filtered list.
 * Admin-only; the same filters as the activity page apply.
 */
export async function GET(req: NextRequest) {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) throw Errors.unauthorized();
    if (user.role !== "ADMIN") throw Errors.forbidden();

    if (req.nextUrl.searchParams.get("format") !== "csv") {
      throw Errors.badRequest("Only format=csv is supported here.");
    }

    const { rows } = await queryActivityRows({ ...parseFilters(req), page: 1, pageSize: 5000 });
    const csv = activityRowsToCsv(rows);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bridgex-user-activity-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  });
}
