import type { NextRequest } from "next/server";
import { getPersonalCard, getBusinessCard } from "@/features/cards/queries";
import { generateVCard, vcardFilename } from "@/lib/vcard";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const handle = url.searchParams.get("handle") ?? "";

  const card =
    type === "business"
      ? await getBusinessCard(handle)
      : await getPersonalCard(handle);

  if (!card) {
    return new Response("Not found", { status: 404 });
  }

  const [firstName, ...rest] = card.name.split(" ");
  const vcf = generateVCard({
    fullName: card.name,
    firstName,
    lastName: rest.join(" ") || null,
    // For a business the org is the business name; for a person it's their company.
    organization: card.isBusiness ? card.name : card.org,
    title: card.isBusiness ? card.org : card.subtitle,
    phone: card.phone,
    whatsapp: card.whatsapp,
    email: card.email,
    website: card.website,
    address: [card.address, card.city, card.country].filter(Boolean).join(", ") || null,
    profileUrl: card.profileUrl,
  });

  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${vcardFilename(card.name)}"`,
      "Cache-Control": "no-store",
    },
  });
}
