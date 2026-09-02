import { requireAdmin } from "@/lib/permissions/guards";
import { handle, ok, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function ollamaBase(): string | null {
  const base = process.env.OLLAMA_BASE_URL?.trim();
  return base ? base.replace(/\/+$/, "") : null;
}

function modelName(): string {
  return process.env.OLLAMA_MODEL?.trim() || "qwen2.5:3b";
}

/** GET — report whether the configured model is present on the Ollama server. */
export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const base = ollamaBase();
    if (!base) throw new ApiError(503, "OLLAMA_BASE_URL is not set.", "not_configured");

    const res = await fetch(`${base}/api/tags`, { cache: "no-store" });
    if (!res.ok) throw new ApiError(502, `Ollama returned HTTP ${res.status}.`, "ollama_error");
    const body = (await res.json()) as { models?: { name?: string }[] };
    const names = (body.models ?? []).map((m) => m.name).filter(Boolean) as string[];
    const model = modelName();
    return ok({
      model,
      present: names.some((n) => n === model || n.startsWith(`${model}`)),
      models: names,
    });
  });
}

/**
 * POST — pull the configured model into the Ollama server (persists on its
 * volume). Admin-only; reachable only server-side over the private network.
 */
export async function POST() {
  return handle(async () => {
    await requireAdmin();
    const base = ollamaBase();
    if (!base) throw new ApiError(503, "OLLAMA_BASE_URL is not set.", "not_configured");
    const model = modelName();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 290_000);
    try {
      const res = await fetch(`${base}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model, stream: false }),
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new ApiError(502, `Pull failed (HTTP ${res.status}): ${text.slice(0, 200)}`, "pull_failed");
      }
      return ok({ model, status: "pulled", detail: text.slice(0, 200) });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        // The pull is still running server-side; report accepted.
        return ok({ model, status: "pulling", detail: "Pull is running; re-check with GET." });
      }
      throw new ApiError(502, "Could not reach the Ollama server.", "unreachable");
    } finally {
      clearTimeout(timer);
    }
  });
}
