import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildUserPrompt,
  profileContentSchema,
  generateProfileContent,
  getOllamaConfig,
  isAiProfileGenerationEnabled,
} from "@/lib/ai/ollama";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

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
      bio: "Professional summary.",
      whoIAm: "I build things.",
      whoIWantToFind: "Partners.",
      whatICanOffer: "Networking.",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects payloads with missing or oversized fields", () => {
    expect(profileContentSchema.safeParse({ bio: "" }).success).toBe(false);
    expect(
      profileContentSchema.safeParse({
        bio: "x".repeat(2001),
        whoIAm: "a",
        whoIWantToFind: "b",
        whatICanOffer: "c",
      }).success,
    ).toBe(false);
  });
});

describe("generateProfileContent against a mocked Ollama server", () => {
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

  it("parses a valid /api/chat response (JSON mode)", async () => {
    vi.stubEnv("OLLAMA_BASE_URL", "http://ollama.test:11434");
    mockFetchOnce({
      message: {
        content: JSON.stringify({
          bio: "Entrepreneur focused on business networking.",
          whoIAm: "I am building BridgeX.",
          whoIWantToFind: "Investors and partners.",
          whatICanOffer: "Introductions and visibility.",
        }),
      },
    });
    const result = await generateProfileContent({ fullName: "Zen See", language: "en" });
    expect(result.bio).toContain("networking");

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
          '```json\n{"bio":"B","whoIAm":"W","whoIWantToFind":"F","whatICanOffer":"O"}\n```',
      },
    });
    const result = await generateProfileContent({});
    expect(result.whoIAm).toBe("W");
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