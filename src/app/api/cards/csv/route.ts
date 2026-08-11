import type { NextRequest } from "next/server";
import { getPersonalCard, getBusinessCard } from "@/features/cards/queries";

function csvEscape(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const handle = url.searchParams.get("handle") ?? "";

  const card =
    type === "business"
      ? await getBusinessCard(handle)
      : await getPersonalCard(handle);

  if (!card) return new Response("Not found", { status: 404 });

  const headers = [
    "Full Name",
    "Phone",
    "WhatsApp",
    "Email",
    "Business Name",
    "Job Title",
    "Website",
    "Profile URL",
  ];
  const row = [
    card.name,
    card.phone,
    card.whatsapp,
    card.email,
    card.isBusiness ? card.name : card.org,
    card.subtitle,
    card.website,
    card.profileUrl,
  ].map(csvEscape);

  // Prefix with UTF-8 BOM so Excel opens it as UTF-8.
  const csv = "﻿" + headers.join(",") + "\r\n" + row.join(",") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${card.handle}-contact.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
