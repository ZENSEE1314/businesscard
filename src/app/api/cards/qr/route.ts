import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { getPersonalCard, getBusinessCard } from "@/features/cards/queries";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const handle = url.searchParams.get("handle") ?? "";

  const card =
    type === "business"
      ? await getBusinessCard(handle)
      : await getPersonalCard(handle);

  if (!card) return new Response("Not found", { status: 404 });

  const png = await QRCode.toBuffer(card.profileUrl, {
    width: 800,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${card.handle}-qr.png"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
