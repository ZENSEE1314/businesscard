// Small typed fetch helper for client components.

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

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
    const json = (await res.json().catch(() => ({}))) as ApiResult<T>;
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Request failed.", code: json.code };
    }
    return json;
  } catch {
    return { ok: false, error: "Network error. Please try again." };
  }
}
