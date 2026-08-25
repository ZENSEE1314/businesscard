import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { extractClientIp } from "@/lib/security/rate-limit";

export class ApiError extends Error {
  status: number;
  code: string;
  /** Seconds until the client may retry (emitted as Retry-After on 429s). */
  retryAfterSec?: number;
  constructor(
    status: number,
    message: string,
    code = "error",
    retryAfterSec?: number,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export const Errors = {
  unauthorized: () => new ApiError(401, "You must be signed in.", "unauthorized"),
  forbidden: (msg = "You do not have permission to do that.") =>
    new ApiError(403, msg, "forbidden"),
  notFound: (msg = "Not found.") => new ApiError(404, msg, "not_found"),
  badRequest: (msg = "Invalid request.") => new ApiError(400, msg, "bad_request"),
  conflict: (msg = "Already exists.") => new ApiError(409, msg, "conflict"),
  tooMany: (
    msg = "Too many attempts. Please try again later.",
    retryAfterSec?: number,
  ) => new ApiError(429, msg, "rate_limited", retryAfterSec),
};

function errorResponse(err: ApiError): NextResponse {
  const headers: Record<string, string> = {};
  if (err.status === 429 && err.retryAfterSec && err.retryAfterSec > 0) {
    headers["Retry-After"] = String(Math.ceil(err.retryAfterSec));
  }
  return NextResponse.json(
    { ok: false, error: err.message, code: err.code },
    { status: err.status, headers },
  );
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

// Wraps a route handler, converting thrown ApiError / ZodError into JSON.
export function handle(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return fn().catch((err: unknown) => {
    if (err instanceof ApiError) {
      return errorResponse(err);
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.issues[0]?.message ?? "Validation failed.",
          code: "validation",
          issues: err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 422 },
      );
    }
    console.error("Unhandled API error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong.", code: "internal" },
      { status: 500 },
    );
  });
}

/**
 * Real client IP behind the Railway proxy chain. Delegates to
 * extractClientIp which ignores private/spoofable XFF entries and normalizes
 * IPv6 — see rate-limit.ts for the full rationale.
 */
export function getClientIp(req: Request): string {
  return extractClientIp(req.headers);
}