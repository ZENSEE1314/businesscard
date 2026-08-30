import "server-only";
import { prisma } from "@/lib/db/prisma";

export interface ProjectRatingItem {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  rating: number;
  comment: string | null;
}

export interface ProjectCard {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  average: number;
  count: number;
  ratings: ProjectRatingItem[];
}

/** Projects for a member's card, each with its rating summary + comments. */
export async function listProjectsForCard(userId: string): Promise<ProjectCard[]> {
  const rows = await prisma.project.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 30,
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      link: true,
      ratings: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          comment: true,
          author: {
            select: {
              profile: { select: { fullName: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((p) => {
    const ratings: ProjectRatingItem[] = p.ratings.map((r) => ({
      id: r.id,
      authorName: r.author.profile?.displayName || r.author.profile?.fullName || "Member",
      authorAvatarUrl: r.author.profile?.avatarUrl ?? null,
      rating: r.rating,
      comment: r.comment,
    }));
    const count = ratings.length;
    const average = count
      ? Math.round((ratings.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      imageUrl: p.imageUrl,
      link: p.link,
      average,
      count,
      ratings,
    };
  });
}
