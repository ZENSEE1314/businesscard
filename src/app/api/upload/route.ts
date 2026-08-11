import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/permissions/guards";
import { storeImage } from "@/lib/storage/storage";
import { handle, ok, Errors, getClientIp } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";

const FOLDERS = new Set(["avatar", "cover", "logo", "business-cover", "post"]);

export async function POST(req: NextRequest) {
  return handle(async () => {
    const user = await requireUser();
    enforceRateLimit(`upload:${user.id}:${getClientIp(req)}`, 40, 60 * 60 * 1000);

    const form = await req.formData();
    const file = form.get("file");
    const folder = String(form.get("folder") ?? "avatar");

    if (!(file instanceof File)) {
      throw Errors.badRequest("No file provided.");
    }
    if (!FOLDERS.has(folder)) {
      throw Errors.badRequest("Invalid upload target.");
    }

    const maxWidth = folder === "post" || folder.includes("cover") ? 1600 : 800;
    const stored = await storeImage(file, folder, maxWidth).catch((e) => {
      throw Errors.badRequest(e instanceof Error ? e.message : "Upload failed.");
    });

    return ok(stored);
  });
}
