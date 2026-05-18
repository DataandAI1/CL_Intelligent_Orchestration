import { LlmSettings, LlmProvider } from "./types";
import { LlmError } from "./errors";
import { GeminiProvider } from "./geminiProvider";
import { OllamaProvider } from "./ollamaProvider";

export function createProvider(settings: LlmSettings): LlmProvider {
  switch (settings.provider) {
    case "gemini":
      return new GeminiProvider(settings.gemini!.apiKey);
    case "ollama":
      return new OllamaProvider(
        settings.ollama!.baseUrl,
        settings.ollama!.model
      );
  }
}

export function getProvider(): LlmProvider {
  const raw = localStorage.getItem("cl-intelligence-engine");
  if (raw) {
    try {
      const settings: LlmSettings = JSON.parse(raw);
      return createProvider(settings);
    } catch {
      // Corrupted localStorage — fall through to env fallback.
    }
  }
  if (process.env.API_KEY) {
    return new GeminiProvider(process.env.API_KEY);
  }
  throw new LlmError(
    "No provider configured. Open Settings to select Gemini or Ollama.",
    "gemini"
  );
}

// Re-export provider classes so SettingsView can use listModels and testConnection directly
export { GeminiProvider } from "./geminiProvider";
export { OllamaProvider } from "./ollamaProvider";

// Re-export types and errors for consumers
export type { LlmProvider, LlmSettings, GenerateStructuredOpts, LlmConnectionTestResult, ProviderId } from "./types";
export { LlmError, LlmAuthError, LlmConnectionError, LlmParseError } from "./errors";
