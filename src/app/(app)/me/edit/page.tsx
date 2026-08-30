import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { ProfileEditForm } from "@/features/profile/edit-form";
import { ProjectsManager } from "@/features/profile/projects-manager";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const [user, categories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: current.id },
      include: {
        profile: true,
        businessProfile: { include: { media: { orderBy: { sortOrder: "asc" } } } },
      },
    }),
    prisma.businessCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  if (!user?.profile) redirect("/onboarding");

  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="px-1 pb-3 text-xl font-bold">Edit profile</h1>
      <ProfileEditForm
        role={user.role}
        profile={JSON.parse(JSON.stringify(user.profile))}
        business={
          user.businessProfile
            ? JSON.parse(JSON.stringify(user.businessProfile))
            : null
        }
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        media={
          user.businessProfile
            ? user.businessProfile.media.map((m) => ({
                id: m.id,
                kind: m.kind,
                section: m.section,
                url: m.url,
                caption: m.caption,
              }))
            : []
        }
      />
      <div className="mt-4">
        <ProjectsManager />
      </div>
    </div>
  );
}
