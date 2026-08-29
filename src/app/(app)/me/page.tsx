import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Pencil, Crown, Lock } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, ButtonLink, Badge } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";
import { getTierConfig } from "@/lib/membership";
import { membershipDurationLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MyProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: current.id },
    include: { profile: true, businessProfile: true },
  });
  if (!user?.profile) redirect("/onboarding");

  const { profile, businessProfile } = user;

  const activeTier =
    user.membershipStatus === "ACTIVE" ? user.membershipTier : null;
  const tierLabel = activeTier ? getTierConfig(activeTier).label : null;
  const isTopTier = activeTier === "BRIDGEMASTER";

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h1 className="text-xl font-bold">Profile</h1>
        <LogoutButton />
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-brand-50 text-xl font-bold text-brand-700">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.fullName.charAt(0)
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{profile.fullName}</h2>
            {profile.jobTitle && (
              <p className="text-sm text-muted">{profile.jobTitle}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant={activeTier ? "brand" : "default"}>
                {tierLabel ? `${tierLabel} member` : "Free member"}
              </Badge>
              {user.role === "ADMIN" && <Badge variant="brand">Admin</Badge>}
              <Badge>{user.points} points</Badge>
              <Badge>{membershipDurationLabel(user.createdAt)}</Badge>
            </div>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href={`/u/${profile.username}`} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4" /> View public card
          </ButtonLink>
          <ButtonLink href="/me/edit" variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Edit profile
          </ButtonLink>
          <ButtonLink href="/me/password" variant="outline" size="sm">
            <Lock className="h-4 w-4" /> Change password
          </ButtonLink>
          {businessProfile && (
            <ButtonLink
              href={`/business/${businessProfile.slug}`}
              variant="outline"
              size="sm"
            >
              Business page
            </ButtonLink>
          )}
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Card className="p-4">
          <div className="text-lg font-bold">{user.points}</div>
          <div className="text-xs text-muted">Current</div>
        </Card>
        <Card className="p-4">
          <div className="text-lg font-bold">{user.lifetimeEarned}</div>
          <div className="text-xs text-muted">Earned</div>
        </Card>
        <Card className="p-4">
          <div className="text-lg font-bold">{user.lifetimeSpent}</div>
          <div className="text-xs text-muted">Redeemed</div>
        </Card>
      </div>

      {/* Membership status */}
      <Card className="mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Crown className={`h-6 w-6 ${activeTier ? "text-amber-500" : "text-muted"}`} />
            <div>
              <div className="font-semibold">
                {tierLabel ? `${tierLabel} membership` : "Free member"}
              </div>
              {activeTier && user.membershipExpiresAt ? (
                <div className="text-xs text-muted">
                  Expires {formatDate(user.membershipExpiresAt)}
                </div>
              ) : (
                <div className="text-xs text-muted">
                  Upgrade to unlock business features
                </div>
              )}
            </div>
          </div>
          {/* Hide the upgrade CTA once at the highest tier. */}
          {!isTopTier && (
            <ButtonLink href="/membership" size="sm">
              {activeTier ? "Upgrade" : "Join"}
            </ButtonLink>
          )}
        </div>
        {activeTier && (
          <p className="mt-2 text-xs text-muted">
            Yearly plan — it returns to the free plan when it expires. We’ll
            remind you 1 month before.
          </p>
        )}
      </Card>

      {user.role === "BUSINESS" && !activeTier && (
        <p className="mt-2 px-1 text-xs text-muted">
          Your membership has ended — renew to restore business features.
        </p>
      )}

      {user.role === "ADMIN" && (
        <Link
          href="/admin"
          className="mt-3 block text-sm font-medium text-primary"
        >
          Admin dashboard →
        </Link>
      )}

      <div className="mt-4">
        <Link href="/points" className="text-sm font-medium text-primary">
          View point history →
        </Link>
      </div>
    </div>
  );
}
