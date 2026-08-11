import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code = "error") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  unauthorized: () => new ApiError(401, "You must be signed in.", "unauthorized"),
  forbidden: (msg = "You do not have permission to do that.") =>
    new ApiError(403, msg, "forbidden"),
  notFound: (msg = "Not found.") => new ApiError(404, msg, "not_found"),
  badRequest: (msg = "Invalid request.") => new ApiError(400, msg, "bad_request"),
  conflict: (msg = "Already exists.") => new ApiError(409, msg, "conflict"),
  tooMany: (msg = "Too many requests. Please slow down.") =>
    new ApiError(429, msg, "rate_limited"),
};

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
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: err.status },
      );
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

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("cf-connecting-ip") ??
    "0.0.0.0"
  );
}
