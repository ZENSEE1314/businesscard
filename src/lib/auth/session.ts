import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { signSessionToken } from "./jwt";

export const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 30;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

interface CreateSessionOpts {
  userId: string;
  role: string;
  userAgent?: string | null;
  ip?: string | null;
}

// Creates a DB-backed session and returns a signed JWT embedding the session id.
export async function createSession(opts: CreateSessionOpts): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

  const session = await prisma.session.create({
    data: {
      userId: opts.userId,
      tokenHash: sha256(raw),
      userAgent: opts.userAgent ?? null,
      ip: opts.ip ?? null,
      expiresAt,
    },
  });

  return signSessionToken(
    { sub: opts.userId, sid: session.id, role: opts.role },
    `${SESSION_TTL_DAYS}d`,
  );
}

// When `remember` is true the cookie persists for the session TTL; otherwise it
// is a session cookie that the browser clears when it closes.
export async function setSessionCookie(
  token: string,
  remember = true,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: SESSION_TTL_DAYS * 86_400 } : {}),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Marks a session revoked so its JWT can no longer authenticate.
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session
    .update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function isSessionActive(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { revokedAt: true, expiresAt: true },
  });
  if (!session) return false;
  if (session.revokedAt) return false;
  if (session.expiresAt.getTime() < Date.now()) return false;
  return true;
}
