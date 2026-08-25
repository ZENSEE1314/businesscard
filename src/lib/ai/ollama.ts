import "server-only";
import { z } from "zod";

// Ollama integration for AI-assisted profile content.
//
// Architecture (Railway):
//   BridgeX Next.js app → authenticated server API (/api/ai/profile)
//     → Ollama service on Railway private networking (ollama-ai.railway.internal:11434)
//     → model kimi-k3:cloud (verified available at ollama.com/library/kimi-k3,
//       tagged "cloud", 2.81T params; served through the standard /api/chat
//       endpoint of a signed-in Ollama server).
//
// NOTE ON `ollama launch claude --model kimi-k3:cloud`: that command launches an
// INTERACTIVE coding CLI workflow on a developer machine — it is NOT how an
// application should call the model. The app always talks HTTP to the Ollama
// server's /api/chat endpoint instead.
//
// Cloud models require the Ollama service to be authenticated (once, via
// `ollama signin` inside the container or a mounted ~/.ollama). If cloud auth
// is missing, Ollama returns an error which we surface verbatim to admins —
// the rest of BridgeX keeps working because every failure here is contained.

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

export function isAiProfileGenerationEnabled(): boolean {
  if (process.env.AI_PROFILE_GENERATION_ENABLED === "false") return false;
  return getOllamaConfig() !== null;
}

// ---------------------------------------------------------------------------
// Response validation — never trust model output shape
// ---------------------------------------------------------------------------

export const profileContentSchema = z.object({
  bio: z.string().min(1).max(2000),
  whoIAm: z.string().min(1).max(2000),
  whoIWantToFind: z.string().min(1).max(2000),
  whatICanOffer: z.string().min(1).max(2000),
});

export type ProfileContent = z.infer<typeof profileContentSchema>;

// ---------------------------------------------------------------------------
// Prompt construction (EN / ID / ZH)
// ---------------------------------------------------------------------------

export type AiLanguage = "en" | "id" | "zh";

const LANGUAGE_INSTRUCTIONS: Record<AiLanguage, string> = {
  en: "Write all four fields in English.",
  id: "Tulis keempat bagian dalam Bahasa Indonesia yang profesional.",
  zh: "用简体中文撰写全部四个部分，语气专业。",
};

const SYSTEM_PROMPT = [
  "You create accurate professional business networking profiles.",
  "STRICT RULES:",
  "- Use ONLY facts supplied by the user in the input JSON.",
  "- NEVER invent qualifications, awards, customers, funding, revenue, certifications, partnerships, or achievements.",
  "- If information is missing, write around it generically instead of fabricating specifics.",
  "- Keep the tone professional and business-focused.",
  '- Respond with ONLY a valid JSON object with keys: "bio", "whoIAm", "whoIWantToFind", "whatICanOffer".',
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
  const config = getOllamaConfig();
  if (!config) {
    throw new OllamaError(
      503,
      "AI profile generation is not configured yet. Ask the administrator to set up the Ollama service.",
      "not_configured",
    );
  }

  const raw = await ollamaChat(
    config,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    true,
  );

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

/** Lightweight reachability probe for admin status display. */
export async function checkOllamaHealth(): Promise<{
  reachable: boolean;
  detail: string;
}> {
  const config = getOllamaConfig();
  if (!config) return { reachable: false, detail: "OLLAMA_BASE_URL is not set." };
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