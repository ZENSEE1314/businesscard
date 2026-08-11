import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3, S3_BUCKET } from "@/lib/storage/storage";

// Streams objects from the S3-compatible bucket. Keeps bucket access private
// while serving uploads over the app's own domain (no public ACL needed).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join("/");

  try {
    const obj = await getS3().send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    if (!obj.Body) return new Response("Not found", { status: 404 });

    const stream = (
      obj.Body as { transformToWebStream: () => ReadableStream }
    ).transformToWebStream();

    return new Response(stream, {
      headers: {
        "Content-Type": obj.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(obj.ContentLength
          ? { "Content-Length": String(obj.ContentLength) }
          : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
