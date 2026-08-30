import "server-only";
import { z } from "zod";

// AI-assisted profile content generation.
//
// Architecture (Railway):
//   BridgeX Next.js app → authenticated server API (/api/ai/profile)
//     → OpenAI-compatible gateway (TokenRa, https://tokenra.io/v1)
//     → model kimi-k3 via POST /v1/chat/completions (Bearer API key).
//
// The OpenAI-compatible path is the primary provider — configured with:
//   OPENAI_API_KEY   (required to enable)
//   OPENAI_BASE_URL  (default https://tokenra.io/v1)
//   OPENAI_MODEL     (default kimi-k3)
//   OPENAI_TIMEOUT_MS (default 55000)
//
// A self-hosted Ollama service remains supported as a fallback provider via
// OLLAMA_BASE_URL (+ optional OLLAMA_MODEL / OLLAMA_API_KEY); it is only used
// when OPENAI_API_KEY is not set. Every failure here is contained — the rest
// of BridgeX keeps working when the AI provider is down or out of quota.

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
}

/** Reads config from env. Returns null when AI is not configured (feature off). */
export function getOllamaConfig(): OllamaConfig | null {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim();
  if (!baseUrl) return null; // not configured — feature gracefully disabled
  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model: process.env.OLLAMA_MODEL?.trim() || "kimi-k3:cloud",
    apiKey: process.env.OLLAMA_API_KEY?.trim() || undefined,
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? "30000"),
  };
}

export interface OpenAIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
}

/** OpenAI-compatible provider (TokenRa gateway, OpenAI, or any compatible endpoint). */
export function getOpenAIConfig(): OpenAIConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    baseUrl: (process.env.OPENAI_BASE_URL?.trim() || "https://tokenra.io/v1").replace(/\/+$/, ""),
    model: process.env.OPENAI_MODEL?.trim() || "kimi-k3",
    apiKey,
    timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS ?? "55000"),
  };
}

export function isAiProfileGenerationEnabled(): boolean {
  if (process.env.AI_PROFILE_GENERATION_ENABLED === "false") return false;
  return getOllamaConfig() !== null || getOpenAIConfig() !== null;
}

// ---------------------------------------------------------------------------
// Response validation — never trust model output shape
// ---------------------------------------------------------------------------

export const profileContentSchema = z.object({
  headline: z.string().min(1).max(160),
  canHelp: z.array(z.string().min(1).max(40)).min(1).max(12),
  lookingFor: z.array(z.string().min(1).max(40)).min(1).max(12),
});

export type ProfileContent = z.infer<typeof profileContentSchema>;

// ---------------------------------------------------------------------------
// Prompt construction (EN / ID / ZH)
// ---------------------------------------------------------------------------

export type AiLanguage = "en" | "id" | "zh";

const LANGUAGE_INSTRUCTIONS: Record<AiLanguage, string> = {
  en: "Write all fields in English.",
  id: "Tulis semua bagian dalam Bahasa Indonesia yang profesional.",
  zh: "用简体中文撰写全部内容，语气专业。",
};

const SYSTEM_PROMPT = [
  "You create accurate professional business networking profiles.",
  "STRICT RULES:",
  "- Use ONLY facts supplied by the user in the input JSON.",
  "- NEVER invent qualifications, awards, customers, funding, revenue, certifications, partnerships, or achievements.",
  "- If information is missing, write around it generically instead of fabricating specifics.",
  "- Keep the tone professional and business-focused.",
  "- headline: one concise sentence describing what the person does (max 160 chars).",
  "- canHelp: up to 12 short tags of what they offer (from the input expertise/products/services).",
  "- lookingFor: up to 12 short tags of what they want (from idealCustomers, desiredPartners, desiredInvestors, desiredDistributors, desiredSuppliers, businessGoals).",
  '- Respond with ONLY a valid JSON object with keys: "headline", "canHelp", "lookingFor".',
].join(" ");

export interface ProfileInput {
  fullName?: string;
  jobTitle?: string;
  company?: string;
  industry?: string;
  location?: string;
  businessDescription?: string;
  products?: string[];
  services?: string[];
  expertise?: string[];
  businessGoals?: string;
  idealCustomers?: string[];
  desiredDistributors?: string[];
  desiredSuppliers?: string[];
  desiredInvestors?: string[];
  desiredPartners?: string[];
  language?: AiLanguage;
}

export function buildUserPrompt(input: ProfileInput): string {
  const lang: AiLanguage =
    input.language && input.language in LANGUAGE_INSTRUCTIONS ? input.language : "en";
  const payload = { ...input, language: lang };
  return `${JSON.stringify(payload)}\n\n${LANGUAGE_INSTRUCTIONS[lang]}`;
}

// ---------------------------------------------------------------------------
// Ollama /api/chat client with timeout + graceful failures
// ---------------------------------------------------------------------------

export class OllamaError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

async function ollamaChat(
  config: OllamaConfig,
  messages: ChatMessage[],
  jsonMode: boolean,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;

    const res = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        stream: false,
        ...(jsonMode ? { format: "json" } : {}),
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      // Surface actionable setup errors without leaking secrets.
      throw new OllamaError(
        502,
        `Ollama service error (${res.status}): ${text.slice(0, 300) || res.statusText}`,
        "ollama_error",
      );
    }

    const data = (await res.json()) as {
      message?: { content?: string };
      error?: string;
    };
    if (data.error) {
      throw new OllamaError(502, `Ollama error: ${data.error}`, "ollama_error");
    }
    const content = data.message?.content ?? "";
    if (!content.trim()) {
      throw new OllamaError(502, "Ollama returned an empty response.", "empty_response");
    }
    return content;
  } catch (err) {
    if (err instanceof OllamaError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new OllamaError(
        504,
        "The AI service took too long to respond. Please try again.",
        "timeout",
      );
    }
    throw new OllamaError(
      502,
      "Could not reach the AI service. It may not be configured yet.",
      "unreachable",
    );
  } finally {
    clearTimeout(timer);
  }
}

async function openaiChat(
  config: OpenAIConfig,
  messages: ChatMessage[],
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.4,
        // NOTE: no `response_format` — some OpenAI-compatible gateway channels
        // (e.g. TokenRa's Chinese-model channels) reject it with 400. The
        // system prompt already demands JSON and extractJson() strips fences.
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let upstreamMsg = "";
      let upstreamCode = "";
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
        upstreamMsg = parsed.error?.message ?? "";
        upstreamCode = parsed.error?.code ?? "";
      } catch {
        /* keep raw text below */
      }
      // Quota errors on TokenRa come back as 403 insufficient_user_quota —
      // give the admin a direct, actionable message instead of raw JSON.
      if (upstreamCode === "insufficient_user_quota" || /insufficient_user_quota|额度不足/i.test(upstreamMsg)) {
        throw new OllamaError(
          503,
          "The AI provider account has no balance left. Top up at tokenra.io (Console → Billing) and try again.",
          "insufficient_quota",
        );
      }
      throw new OllamaError(
        502,
        `AI service error (${res.status}): ${(upstreamMsg || text).slice(0, 300) || res.statusText}`,
        "ai_error",
      );
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (data.error?.message) throw new OllamaError(502, `AI error: ${data.error.message}`, "ai_error");
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) throw new OllamaError(502, "AI returned an empty response.", "empty_response");
    return content;
  } catch (err) {
    if (err instanceof OllamaError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new OllamaError(504, "The AI service took too long to respond. Please try again.", "timeout");
    }
    throw new OllamaError(502, "Could not reach the AI service.", "unreachable");
  } finally {
    clearTimeout(timer);
  }
}

function extractJson(raw: string): unknown {
  // Models occasionally wrap JSON in prose or code fences — find the object.
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new OllamaError(502, "AI returned invalid JSON.", "invalid_json");
  }
}

/**
 * Generates editable profile sections from user-supplied facts only.
 * Throws OllamaError with useful messages when the service is unavailable.
 */
export async function generateProfileContent(
  input: ProfileInput,
): Promise<ProfileContent> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserPrompt(input) },
  ];

  const raw = await runAiChat(messages);

  const parsed = profileContentSchema.safeParse(extractJson(raw));
  if (!parsed.success) {
    throw new OllamaError(
      502,
      "The AI response did not match the expected format. Please try again.",
      "invalid_shape",
    );
  }
  return parsed.data;
}

/** Dispatches to OpenAI-compatible API if a key is set, else Ollama. */
async function runAiChat(messages: ChatMessage[]): Promise<string> {
  const openai = getOpenAIConfig();
  if (openai) return openaiChat(openai, messages);

  const config = getOllamaConfig();
  if (!config) {
    throw new OllamaError(
      503,
      "AI generation is not configured yet. Ask the administrator to set OLLAMA_BASE_URL (or OPENAI_API_KEY for the built-in provider).",
      "not_configured",
    );
  }
  return ollamaChat(config, messages, true);
}

/** Lightweight reachability probe for admin status display (provider-aware). */
export async function checkOllamaHealth(): Promise<{
  reachable: boolean;
  detail: string;
}> {
  const openai = getOpenAIConfig();
  if (openai) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${openai.baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${openai.apiKey}` },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) {
        return { reachable: false, detail: `HTTP ${res.status} from the AI gateway.` };
      }
      const body = (await res.json()) as { data?: { id?: string }[] };
      const ids = (body.data ?? []).map((m) => m.id).filter(Boolean) as string[];
      return {
        reachable: true,
        detail: `Gateway reachable (${openai.baseUrl}). Model: ${openai.model}${
          ids.length ? ` · ${ids.length} models enabled` : ""
        }`,
      };
    } catch {
      return { reachable: false, detail: "Could not connect to the AI gateway." };
    }
  }

  const config = getOllamaConfig();
  if (!config) return { reachable: false, detail: "No AI provider configured (set OPENAI_API_KEY or OLLAMA_BASE_URL)." };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${config.baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { reachable: false, detail: `HTTP ${res.status} from Ollama.` };
    }
    const body = (await res.json()) as { models?: { name?: string }[] };
    const names = (body.models ?? []).map((m) => m.name).filter(Boolean);
    return {
      reachable: true,
      detail: names.length
        ? `Reachable. Models: ${names.slice(0, 5).join(", ")}`
        : "Reachable. No local models listed (cloud models are pulled on demand).",
    };
  } catch {
    return { reachable: false, detail: "Could not connect to the Ollama service." };
  }
}