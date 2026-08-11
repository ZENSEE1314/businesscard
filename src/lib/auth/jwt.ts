import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export interface SessionTokenPayload {
  sub: string; // user id
  sid: string; // session id (for revocation)
  role: string;
  [key: string]: unknown;
}

const alg = "HS256";

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

export async function signSessionToken(
  payload: SessionTokenPayload,
  expiresIn = "30d",
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.sub === "string" &&
      typeof payload.sid === "string" &&
      typeof payload.role === "string"
    ) {
      return payload as SessionTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}
