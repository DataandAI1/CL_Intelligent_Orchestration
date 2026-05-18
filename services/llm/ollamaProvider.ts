import { LlmProvider, GenerateStructuredOpts } from "./types";
import { LlmConnectionError, LlmParseError } from "./errors";

const versionCache = new Map<string, { version: string; fetchedAt: number }>();
const VERSION_TTL_MS = 5 * 60 * 1000;

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

function corsHint(baseUrl: string): string {
  return (
    `Could not reach Ollama at ${baseUrl}. If Ollama is running, ensure your app's origin is in OLLAMA_ORIGINS ` +
    `(e.g., \`OLLAMA_ORIGINS=http://localhost:3000 ollama serve\`).`
  );
}

export class OllamaProvider implements LlmProvider {
  constructor(private baseUrl: string, private model: string) {}

  private async getVersion(): Promise<string | null> {
    const cached = versionCache.get(this.baseUrl);
    if (cached && Date.now() - cached.fetchedAt < VERSION_TTL_MS) {
      return cached.version;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/version`);
      if (!res.ok) return null;
      const data = await res.json();
      const version: string = data.version ?? "";
      versionCache.set(this.baseUrl, { version, fetchedAt: Date.now() });
      return version;
    } catch {
      // Cache a null sentinel so we don't retry on every call within TTL
      versionCache.set(this.baseUrl, { version: "", fetchedAt: Date.now() });
      return null;
    }
  }

  private buildOllamaPrompt(prompt: string, schema: object): string {
    return (
      `${prompt}\n\n` +
      `IMPORTANT: You MUST respond with valid JSON matching this exact schema:\n` +
      `${JSON.stringify(schema, null, 2)}\n\n` +
      `Do not include any text outside the JSON object.`
    );
  }

  async generateStructured<T>(opts: GenerateStructuredOpts): Promise<T> {
    const version = await this.getVersion();
    const supportsNativeSchema =
      version !== null && version !== "" && compareVersions(version, "0.5.0") >= 0;

    const requestBody: Record<string, any> = {
      model: this.model,
      stream: false,
    };

    if (supportsNativeSchema) {
      requestBody.prompt = opts.prompt;
      requestBody.format = opts.jsonSchema;
    } else {
      requestBody.prompt = this.buildOllamaPrompt(opts.prompt, opts.jsonSchema);
      requestBody.format = "json";
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (err: any) {
      throw new LlmConnectionError(corsHint(this.baseUrl), "ollama", err);
    }

    if (!res.ok) {
      throw new LlmConnectionError(
        `Ollama responded with HTTP ${res.status} ${res.statusText}`,
        "ollama"
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch (err) {
      throw new LlmParseError(
        "Failed to parse Ollama HTTP response as JSON",
        "ollama",
        err
      );
    }

    const responseText: string = data.response ?? "";
    try {
      return JSON.parse(responseText) as T;
    } catch (err) {
      throw new LlmParseError(
        `Ollama response field was not valid JSON: ${responseText.slice(0, 200)}`,
        "ollama",
        err
      );
    }
  }

  async testConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) {
        return {
          ok: false,
          detail: `Ollama responded with HTTP ${res.status} ${res.statusText}`,
        };
      }
      const data = await res.json();
      const count: number = Array.isArray(data.models) ? data.models.length : 0;
      return { ok: true, detail: `Connected — ${count} models available` };
    } catch (err: any) {
      return { ok: false, detail: corsHint(this.baseUrl) };
    }
  }

  static async listModels(baseUrl: string): Promise<string[]> {
    try {
      const res = await fetch(`${baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.models)
        ? data.models.map((m: any) => m.name as string)
        : [];
    } catch {
      return [];
    }
  }
}
