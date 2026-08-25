// Small typed fetch helper for client components.

export type ApiResult<T> =
  | { ok: true; data: T; error?: undefined; code?: undefined }
  | { ok: false; data?: undefined; error: string; code?: string };

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as Partial<ApiResult<T>>;
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Request failed.", code: json.code };
    }
    if (!json.ok || json.data === undefined) {
      return { ok: false, error: json.error ?? "Unexpected response.", code: json.code };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}