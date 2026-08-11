import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, Pencil, Crown } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, ButtonLink, Badge } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: current.id },
    include: { profile: true, businessProfile: true },
  });
  if (!user?.profile) redirect("/onboarding");

  const { profile, businessProfile } = user;

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
            <div className="mt-1 flex gap-2">
              <Badge variant={user.role === "BUSINESS" ? "brand" : "default"}>
                {user.role === "BUSINESS" ? "Business" : "Member"}
              </Badge>
              <Badge>{user.points} points</Badge>
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

      {user.role !== "BUSINESS" && (
        <Link href="/membership" className="mt-4 block">
          <Card className="flex items-center gap-3 bg-gradient-to-r from-brand-600 to-accent p-4 text-white">
            <Crown className="h-6 w-6" />
            <div>
              <div className="font-semibold">Upgrade to Member Club</div>
              <div className="text-sm text-white/80">
                Become a business member — advertise, get featured, and network.
              </div>
            </div>
          </Card>
        </Link>
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
