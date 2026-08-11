import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export interface StoredImage {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8MB

let s3: S3Client | null = null;
export function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: env.s3.region || "auto",
      endpoint: env.s3.endpoint || undefined,
      // Provider addressing style. Railway/Tigris buckets use virtual-host
      // (default); set S3_FORCE_PATH_STYLE=true for MinIO-style path routing.
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: env.s3.accessKeyId,
        secretAccessKey: env.s3.secretAccessKey,
      },
    });
  }
  return s3;
}

export const S3_BUCKET = env.s3.bucket;

function randomName(ext: string): string {
  return `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
}

async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (env.storageDriver === "s3") {
    await getS3().send(
      new PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    // If a public bucket URL is configured, use it directly; otherwise serve
    // through the app proxy (/api/files/*) so we never depend on public ACLs.
    const base = env.s3.publicUrl.replace(/\/$/, "");
    return base ? `${base}/${key}` : `/api/files/${key}`;
  }

  // Local disk driver (development): write under /public so Next serves it.
  const publicDir = path.join(process.cwd(), "public", key);
  await fs.mkdir(path.dirname(publicDir), { recursive: true });
  await fs.writeFile(publicDir, body);
  return `/${key}`;
}

const ALLOWED_VIDEO_MIME = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60MB

export interface StoredVideo {
  url: string;
  kind: "video";
  mimeType: string;
}

// Stores an uploaded video as-is (no transcoding). Validates type and size.
export async function storeVideo(
  file: File,
  folder: string,
): Promise<StoredVideo> {
  if (!ALLOWED_VIDEO_MIME.has(file.type)) {
    throw new Error("Unsupported video type. Use MP4, WebM or MOV.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video is too large (max 60MB).");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === "video/webm" ? "webm" : "mp4";
  const key = `uploads/${folder}/${randomName(ext)}`;
  const url = await putObject(key, buffer, file.type);
  return { url, kind: "video", mimeType: file.type };
}

// Validates, compresses and stores an uploaded image plus a thumbnail.
// Never trusts the client-supplied extension — the format is derived from the
// decoded image via sharp.
export async function storeImage(
  file: File,
  folder: string,
  maxWidth = 1600,
): Promise<StoredImage> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Unsupported image type.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }

  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { failOn: "error" });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Invalid image.");
  }

  const main = await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumb = await sharp(input)
    .rotate()
    .resize({ width: 400, height: 400, fit: "cover" })
    .webp({ quality: 75 })
    .toBuffer();

  const base = randomName("webp");
  const key = `uploads/${folder}/${base}`;
  const thumbKey = `uploads/${folder}/thumb-${base}`;

  const [url, thumbUrl] = await Promise.all([
    putObject(key, main.data, "image/webp"),
    putObject(thumbKey, thumb, "image/webp"),
  ]);

  return {
    url,
    thumbUrl,
    width: main.info.width,
    height: main.info.height,
  };
}
