// Central, typed access to environment variables with sane fallbacks.
// Server-only values must never be imported into client components.

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return "";
  }
  return value;
}

export const env = {
  appUrl:
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "BridgeX",
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  authSecret: required("AUTH_SECRET", process.env.AUTH_SECRET),

  storageDriver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    region: process.env.S3_REGION ?? "auto",
    bucket: process.env.S3_BUCKET ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    publicUrl: process.env.S3_PUBLIC_URL ?? "",
  },

  initialAdmin: {
    email: process.env.INITIAL_ADMIN_EMAIL ?? "",
    password: process.env.INITIAL_ADMIN_PASSWORD ?? "",
  },

  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? "587"),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    from: process.env.SMTP_FROM ?? "BridgeX <no-reply@example.com>",
  },
};
