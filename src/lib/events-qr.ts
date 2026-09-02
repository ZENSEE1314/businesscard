import "server-only";
import crypto from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// Event QR codes.
//
//  1. Attendance QR — encodes `{appUrl}/events/{id}/attend?t={token}` where
//     token is an HMAC of the event id (AUTH_SECRET). Attendees scan it at the
//     venue; the attend page confirms and stamps EventAttendee.attendedAt.
//
//  2. Invite QR — encodes `{appUrl}/register?ref={hostReferralCode}&src=event
//     &event={eventId}`. New users who sign up through it join under the event
//     host (referral tree, EVENT_INVITE source) and become attendees.
// ---------------------------------------------------------------------------

/** Stable per-event attendance token (HMAC-SHA256, truncated). */
export function eventAttendanceToken(eventId: string): string {
  return createHmac("sha256", env.authSecret)
    .update(`event-attend:${eventId}`)
    .digest("hex")
    .slice(0, 32);
}

/** Constant-time token check. */
export function verifyEventAttendanceToken(eventId: string, token: string): boolean {
  const expected = eventAttendanceToken(eventId);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token ?? "", "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Absolute URL the attendance QR encodes. */
export function eventAttendanceUrl(eventId: string): string {
  return `${env.appUrl}/events/${eventId}/attend?t=${eventAttendanceToken(eventId)}`;
}

/** Absolute signup URL the event-invite QR encodes (host gets the referral). */
export function eventInviteUrl(eventId: string, hostReferralCode: string): string {
  return `${env.appUrl}/register?ref=${encodeURIComponent(hostReferralCode)}&src=event&event=${encodeURIComponent(eventId)}`;
}

// Re-exported for tests that assert digest behaviour.
export const _crypto = crypto;
