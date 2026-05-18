export type ProviderId = 'gemini' | 'ollama';

export interface LlmSettings {
  provider: ProviderId;
  gemini?: {
    apiKey: string;
  };
  ollama?: {
    baseUrl: string;
    model: string;
  };
}

export interface GenerateStructuredOpts {
  prompt: string;
  jsonSchema: object;
  schemaDescription?: string;
}

export interface LlmProvider {
  generateStructured<T>(opts: GenerateStructuredOpts): Promise<T>;
  testConnection(): Promise<{ ok: boolean; detail: string }>;
}

export interface LlmConnectionTestResult {
  ok: boolean;
  detail: string;
}
