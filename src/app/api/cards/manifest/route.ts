import type { NextRequest } from "next/server";
import { getPersonalCard, getBusinessCard } from "@/features/cards/queries";

// Per-card web app manifest so "Add to Home Screen" installs THIS person's card
// (named after them, opening straight to their card) rather than the whole app.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const handle = url.searchParams.get("handle") ?? "";

  const card =
    type === "business"
      ? await getBusinessCard(handle)
      : await getPersonalCard(handle);

  if (!card) return new Response("Not found", { status: 404 });

  const icons: Record<string, unknown>[] = [];
  if (card.avatarUrl) {
    icons.push({
      src: card.avatarUrl,
      sizes: "512x512",
      type: card.avatarUrl.endsWith(".webp") ? "image/webp" : "image/png",
      purpose: "any",
    });
  }
  icons.push(
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    {
      src: "/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  );

  const manifest = {
    name: card.name,
    short_name: card.name.slice(0, 30),
    description: card.subtitle ?? `${card.name} on BridgeX`,
    start_url: card.path,
    scope: card.path,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons,
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
