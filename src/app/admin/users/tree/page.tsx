import type { Metadata } from "next";
import { getRoots } from "@/features/admin/tree";
import { ReferralTree } from "@/components/admin/referral-tree";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "User Network Tree" };

export default async function AdminTreePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tier?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const roots = await getRoots({
    status: sp.status,
    tier: sp.tier,
    source: sp.source,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">User Network Tree</h1>
        <p className="mt-1 text-sm text-muted">
          How members entered BridgeX — through a referral link, someone’s
          digital card, QR code, NFC card or event invitation. Ordinary saved
          contacts are not shown as parent-child links.
        </p>
      </div>

      {/* Filters */}
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Filter by activity" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="DORMANT">Dormant</option>
          <option value="NEW">New</option>
        </select>
        <select name="tier" defaultValue={sp.tier ?? ""} aria-label="Filter by tier" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="">All tiers</option>
          <option value="BASIC">Basic</option>
          <option value="GOLD">Gold</option>
          <option value="DIAMOND">Diamond</option>
        </select>
        <select name="source" defaultValue={sp.source ?? ""} aria-label="Filter by signup source" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm">
          <option value="">All sources</option>
          <option value="DIRECT">Direct registration</option>
          <option value="REFERRAL_LINK">Referral link</option>
          <option value="CARD_LINK">Digital card</option>
          <option value="QR_SCAN">QR scan</option>
          <option value="NFC_CARD">NFC card</option>
          <option value="EVENT_INVITE">Event invite</option>
        </select>
        <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg">
          Apply
        </button>
      </form>

      <ReferralTree roots={roots} />
    </div>
  );
}