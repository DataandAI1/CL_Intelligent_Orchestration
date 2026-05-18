import { GoogleGenAI, Type } from "@google/genai";
import { LlmProvider, GenerateStructuredOpts } from "./types";
import { LlmAuthError, LlmConnectionError, LlmParseError } from "./errors";

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  // Recursive tree walk: standard JSON Schema -> @google/genai Type-enum format
  private toGeminiSchema(schema: Record<string, any>): Record<string, any> {
    const typeMap: Record<string, any> = {
      string: Type.STRING,
      integer: Type.INTEGER,
      number: Type.NUMBER,
      object: Type.OBJECT,
      array: Type.ARRAY,
      boolean: Type.BOOLEAN,
    };

    const result: Record<string, any> = {};

    if (schema.type) {
      result.type = typeMap[schema.type] ?? schema.type;
    }

    if (schema.description) {
      result.description = schema.description;
    }

    if (schema.enum) {
      result.enum = schema.enum;
    }

    if (schema.required) {
      result.required = schema.required;
    }

    if (schema.properties) {
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([key, val]) => [
          key,
          this.toGeminiSchema(val as Record<string, any>),
        ])
      );
    }

    if (schema.items) {
      result.items = this.toGeminiSchema(schema.items as Record<string, any>);
    }

    return result;
  }

  async generateStructured<T>(opts: GenerateStructuredOpts): Promise<T> {
    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: opts.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: this.toGeminiSchema(opts.jsonSchema as Record<string, any>),
        },
      });

      const text = response.text || "";
      try {
        return JSON.parse(text) as T;
      } catch (parseErr) {
        throw new LlmParseError(
          `Failed to parse Gemini response as JSON: ${parseErr}`,
          "gemini",
          parseErr
        );
      }
    } catch (err: any) {
      if (err instanceof LlmParseError) throw err;

      // Detect auth errors from SDK message
      const msg: string = err?.message ?? String(err);
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        msg.includes("API_KEY_INVALID") ||
        msg.includes("PERMISSION_DENIED") ||
        msg.includes("401") ||
        msg.includes("403")
      ) {
        throw new LlmAuthError(
          `Gemini API key invalid or unauthorized: ${msg}`,
          "gemini",
          err
        );
      }

      throw new LlmConnectionError(
        `Gemini API request failed: ${msg}`,
        "gemini",
        err
      );
    }
  }

  async testConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: 'Respond with {"ok":true}',
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: { ok: { type: Type.BOOLEAN } },
          },
        },
      });

      const text = response.text || "";
      JSON.parse(text); // verify it parses
      return { ok: true, detail: "API key valid — model: gemini-2.5-flash" };
    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      return { ok: false, detail: msg };
    }
  }
}
