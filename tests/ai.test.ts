import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildUserPrompt,
  profileContentSchema,
  generateProfileContent,
  getOllamaConfig,
  getOpenAIConfig,
  isAiProfileGenerationEnabled,
} from "@/lib/ai/ollama";

beforeEach(() => {
  // Keep the OpenAI-compatible provider out of the picture unless a test
  // explicitly enables it — otherwise Ollama-path tests are ambiguous.
  vi.stubEnv("OPENAI_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function mockFetchOnce(body: unknown, status = 200) {
  return vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

describe("configuration", () => {
  it("returns null when OLLAMA_BASE_URL is missing (feature off)", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    expect(getOllamaConfig()).toBeNull();
    expect(isAiProfileGenerationEnabled()).toBe(false);
  });

  it("reads model and key when configured", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama-ai.railway.internal:11434/");
    vi.stubEnv("OLLAMA_MODEL", "kimi-k3:cloud");
    vi.stubEnv("OLLAMA_API_KEY", "secret-key");
    const cfg = getOllamaConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.baseUrl).toBe("http://ollama-ai.railway.internal:11434"); // trailing slash trimmed
    expect(cfg!.model).toBe("kimi-k3:cloud");
    expect(cfg!.apiKey).toBe("secret-key");
    expect(isAiProfileGenerationEnabled()).toBe(true);
  });

  it("env kill-switch disables the feature even when configured", () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
    vi.stubEnv("AI_PROFILE_GENERATION_ENABLED", "false");
    expect(isAiProfileGenerationEnabled()).toBe(false);
  });
});

describe("prompt building", () => {
  it("includes user facts and language instruction", () => {
    const prompt = buildUserPrompt({
      fullName: "Zen See",
      jobTitle: "Entrepreneur",
      company: "BridgeX",
      desiredPartners: ["investors", "business owners"],
      language: "id",
    });
    expect(prompt).toContain('"fullName":"Zen See"');
    expect(prompt).toContain("Bahasa Indonesia");
  });

  it("falls back to English for unsupported language values", () => {
    const prompt = buildUserPrompt({ fullName: "A", language: "fr" as never });
    expect(prompt).toContain("English");
  });
});

describe("response validation", () => {
  it("accepts a well-formed payload", () => {
    const parsed = profileContentSchema.safeParse({
      headline: "Professional networking",
      canHelp: ["introductions", "events"],
      lookingFor: ["investors", "partners"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects payloads with missing or oversized fields", () => {
    expect(profileContentSchema.safeParse({ headline: "" }).success).toBe(false);
    expect(
      profileContentSchema.safeParse({
        headline: "",
        canHelp: [],
        lookingFor: [],
      }).success,
    ).toBe(false);
  });
});

describe("generateProfileContent against a mocked Ollama server", () => {
  it("parses a valid /api/chat response (JSON mode)", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test:11434");
    mockFetchOnce({
      message: {
        content: JSON.stringify({
          headline: "Entrepreneur focused on business networking.",
          canHelp: ["introductions", "digital visibility"],
          lookingFor: ["investors", "partners"],
        }),
      },
    });
    const result = await generateProfileContent({ fullName: "Zen See", language: "en" });
    expect(result.headline).toContain("networking");

    // Verify request shape sent to Ollama.
    const fetchMock = vi.mocked(fetch);
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init!.body));
    expect(init!.method).toBe("POST");
    expect(body.model).toBe("kimi-k3:cloud");
    expect(body.stream).toBe(false);
    expect(body.format).toBe("json");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("NEVER invent");
  });

  it("extracts JSON wrapped in code fences", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test:11434");
    mockFetchOnce({
      message: {
        content:
          '```json\n{"headline":"H","canHelp":["A"],"lookingFor":["B"]}\n```',
      },
    });
    const result = await generateProfileContent({});
    expect(result.headline).toBe("H");
  });

  it("throws not_configured without OLLAMA_BASE_URL", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    await expect(generateProfileContent({})).rejects.toThrow(/not configured/i);
  });

  it("surfaces HTTP errors from the Ollama service", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test:11434");
    mockFetchOnce({ error: "model requires sign-in" }, 403);
    await expect(generateProfileContent({})).rejects.toThrow(/403/);
  });

  it("handles network failure as unreachable", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test:11434");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    await expect(generateProfileContent({})).rejects.toThrow(/reach the AI service/i);
  });

  it("times out slow responses", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test:11434");
    vi.stubEnv("OLLAMA_TIMEOUT_MS", "50");
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const e = new Error("aborted");
          e.name = "AbortError";
          reject(e);
        });
      })),
    );
    await expect(generateProfileContent({})).rejects.toThrow(/too long/i);
  });
});

describe("OpenAI-compatible provider (TokenRa)", () => {
  it("reads config with TokenRa defaults", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const cfg = getOpenAIConfig();
    expect(cfg).not.toBeNull();
    expect(cfg!.baseUrl).toBe("https://tokenra.io/v1");
    expect(cfg!.model).toBe("kimi-k3");
    expect(cfg!.apiKey).toBe("sk-test");
    expect(isAiProfileGenerationEnabled()).toBe(true);
  });

  it("is disabled without a key even when Ollama is unset", () => {
    expect(getOpenAIConfig()).toBeNull();
    expect(isAiProfileGenerationEnabled()).toBe(false);
  });

  it("sends an OpenAI-style request (no response_format) and parses the reply", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_BASE_URL", "https://tokenra.io/v1");
    vi.stubEnv("OPENAI_MODEL", "kimi-k3");
    mockFetchOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              headline: "Gateway-powered headline.",
              canHelp: ["intros"],
              lookingFor: ["partners"],
            }),
          },
        },
      ],
    });
    const result = await generateProfileContent({ fullName: "Zen See", language: "en" });
    expect(result.headline).toContain("Gateway-powered");

    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://tokenra.io/v1/chat/completions");
    expect(init!.method).toBe("POST");
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(String(init!.body));
    expect(body.model).toBe("kimi-k3");
    expect(body.stream).toBeUndefined();
    expect(body.response_format).toBeUndefined();
    expect(body.messages[0].role).toBe("system");
  });

  it("maps quota errors to an actionable message", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    mockFetchOnce(
      { error: { message: "用户额度不足", code: "insufficient_user_quota" } },
      403,
    );
    await expect(generateProfileContent({})).rejects.toThrow(/no balance left/i);
  });

  it("extracts JSON wrapped in code fences from gateway replies", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    mockFetchOnce({
      choices: [
        {
          message: {
            content:
              '```json\n{"headline":"H","canHelp":["A"],"lookingFor":["B"]}\n```',
          },
        },
      ],
    });
    const result = await generateProfileContent({});
    expect(result.headline).toBe("H");
  });

  it("still throws not_configured when no provider is set", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "");
    await expect(generateProfileContent({})).rejects.toThrow(/not configured/i);
  });
});