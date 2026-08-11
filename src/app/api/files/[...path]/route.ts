import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3, S3_BUCKET } from "@/lib/storage/storage";

// Streams objects from the S3-compatible bucket. Supports HTTP Range requests
// so videos are seekable in the browser. Keeps bucket access private.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");
  const range = req.headers.get("range") ?? undefined;

  try {
    const obj = await getS3().send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key, Range: range }),
    );
    if (!obj.Body) return new Response("Not found", { status: 404 });

    const stream = (
      obj.Body as { transformToWebStream: () => ReadableStream }
    ).transformToWebStream();

    const headers: Record<string, string> = {
      "Content-Type": obj.ContentType ?? "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (obj.ContentLength) headers["Content-Length"] = String(obj.ContentLength);
    if (obj.ContentRange) headers["Content-Range"] = obj.ContentRange;

    // 206 when the client asked for a byte range (video seeking).
    return new Response(stream, { status: range ? 206 : 200, headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
