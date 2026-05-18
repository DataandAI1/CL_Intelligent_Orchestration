# Plan: Settings Tab — Intelligence Engine Selection

**Date:** 2026-05-18
**Status:** APPROVED — Consensus reached (Iteration 1) — Architect: PROCEED, Critic: APPROVE (93/100)
**Risk Level:** Medium (secrets handling, refactor scope, Ollama JSON parity)

---

## 1. RALPLAN-DR Summary

### Principles

1. **Provider abstraction must not leak Gemini-specific types into views.** Views import domain-level functions (`expandRequirements`, `generateArchitecture`, etc.), never `GoogleGenAI` or `Type` from `@google/genai`. The adapter boundary lives in the service layer.
2. **Settings must be runtime-changeable without rebuild.** The current `process.env.API_KEY` baked at build time via Vite `define` becomes a fallback only. The primary key source is the user-entered value persisted in `localStorage` and broadcast via React Context.
3. **Existing behavior is the default path.** If a build-time `GEMINI_API_KEY` exists and the user has not configured settings, the app works exactly as it does today — zero-config regression.
4. **Prompt+schema is the contract, not SDK calls.** Every domain function reduces to: "send this prompt with this JSON schema, get typed JSON back." That contract is provider-agnostic.
5. **No backend required.** Both Gemini API and Ollama run from the browser (Gemini via HTTPS, Ollama via localhost fetch). No proxy server is introduced.

### Decision Drivers

| # | Driver | Impact |
|---|--------|--------|
| 1 | **Gemini structured output uses `responseSchema` + `responseMimeType`** — a provider-specific SDK feature. Ollama has no equivalent SDK; it uses a `format` field (JSON mode) or prompt-based schema enforcement. The adapter must normalize this. | Shapes the entire provider interface |
| 2 | **All 8 service functions share the same pattern** — construct prompt string, call `ai.models.generateContent(...)` with a schema, parse JSON. This uniformity makes a single `generateStructured<T>()` method viable. | Confirms adapter feasibility |
| 3 | **No state library, no router.** Settings state needs a lightweight delivery mechanism (React Context) and the "page" needs to integrate into the existing `useState` step machine or sit outside it. | Shapes UI architecture |

### Viable Options

**Option A: Provider Strategy / Adapter Pattern** (RECOMMENDED)
- Define a single `LlmProvider` interface with `generateStructured<T>(opts)`.
- Two implementations: `GeminiProvider` (wraps `@google/genai`), `OllamaProvider` (wraps `fetch` to Ollama REST API).
- A factory reads settings context, returns the active provider.
- Domain functions (`analyzeProjectAssets`, etc.) call `getProvider().generateStructured(...)` instead of raw SDK calls.
- **Pros:** Clean separation; easy to add future providers (OpenAI, Anthropic); each adapter owns its own JSON-schema strategy; domain functions stay readable.
- **Cons:** Requires refactoring all 8 functions in `geminiService.ts`; slightly more files.

**Option B: Internal dispatch per function** (`if (provider === 'ollama') ...`)
- Each of the 8 functions gains an `if/else` branch internally.
- **Pros:** Minimal new files; faster to write initially.
- **Cons:** 8 functions x 2 branches = 16 code paths; Gemini SDK types leak everywhere; adding a third provider means touching all 8 functions again; violates Open/Closed principle. **Ruled out** — the uniform call pattern across all 8 functions makes Option A strictly better with negligible extra work.

**Option C: Single LLM-agnostic prompt+schema runner replacing per-function flow**
- Collapse all 8 functions into a generic `runLlmTask(taskName, params)` dispatcher.
- **Pros:** Maximum DRY.
- **Cons:** Loses the self-documenting function signatures (`analyzeProjectAssets(name, desc, assets)`); makes each call site harder to read; over-abstracts for 8 functions. **Ruled out** — the domain-specific function signatures are valuable for readability and type safety.

**Selected: Option A.** Option B invalidated by maintenance cost scaling. Option C invalidated by loss of domain-specific type safety.

### Mode

**SHORT** with elevated attention on: (a) API key storage threat model, (b) Ollama CORS.

---

## 2. Goals & Non-Goals

### Goals
- Users can select between Gemini API and Local Ollama as the Intelligence Engine from a Settings page.
- Gemini users can enter/update their API key at runtime (persisted in `localStorage`).
- Ollama users can configure a base URL (default `http://localhost:11434`) and select a model from a live-fetched list.
- A "Test Connection" button validates the chosen provider returns a response.
- Existing Gemini flow with a build-time `GEMINI_API_KEY` continues to work without any user configuration (backward compatible).
- When no provider is configured and no fallback key exists, LLM-triggering actions show a clear prompt to configure settings instead of crashing.

### Non-Goals
- No server-side proxy or backend.
- No encrypted/secure key vault — `localStorage` is explicitly acknowledged as browser-local, not secrets-grade.
- No support for providers beyond Gemini and Ollama in this iteration.
- No streaming responses (current app uses batch JSON responses).
- No per-function provider override (e.g., "use Gemini for architecture, Ollama for simulation"). Single global provider.

---

## 3. UI/UX Spec

### Nav Placement

The current nav uses a numbered step workflow (`00 START > 01 REQUIREMENTS > 02 DESIGN STUDIO > 03 PROJECT PLANNER`). A Settings tab does NOT belong in this sequential workflow — it is a utility, not a step.

**Decision:** Add a gear icon button to the **right side of the header**, after the nav items and before the right edge. It sits visually separated from the workflow steps. Clicking it sets `step` to `'settings'` using the existing state machine (extended to `'start' | 'gather' | 'design' | 'plan' | 'settings'`).

The gear icon uses the gold accent (`#D4B980`) when active, `#808080` otherwise — matching the existing `NavItem` styling convention.

### Settings Page Layout

```
+------------------------------------------------------------------+
| [Logo] CONTEXT LATTICE          00 > 01 > 02 > 03      [gear]   |
+------------------------------------------------------------------+
|                                                                   |
|   INTELLIGENCE ENGINE SETTINGS                                    |
|   Configure your AI provider for all generation tasks.            |
|                                                                   |
|   +---------------------------+  +----------------------------+   |
|   | [Gemini icon]             |  | [Ollama icon]              |   |
|   | Gemini API               *|  | Local Ollama               |   |
|   | Cloud-hosted, fast,       |  | Private, local, any model  |   |
|   | structured JSON output    |  | from your Ollama install   |   |
|   +---------------------------+  +----------------------------+   |
|                                                                   |
|   --- Provider Configuration (contextual panel below) ---         |
|                                                                   |
|   IF GEMINI SELECTED:                                             |
|   +----------------------------------------------------------+   |
|   | API Key                                                   |   |
|   | [*****************************] [show/hide toggle]        |   |
|   |                                                           |   |
|   | Model: gemini-2.5-flash (hardcoded for this release)      |   |
|   |                                                           |   |
|   | [!] Key stored in browser localStorage — not suitable     |   |
|   |     for shared or public machines.                        |   |
|   +----------------------------------------------------------+   |
|                                                                   |
|   IF OLLAMA SELECTED:                                             |
|   +----------------------------------------------------------+   |
|   | Server URL                                                |   |
|   | [http://localhost:11434                              ]     |   |
|   |                                                           |   |
|   | Model                                                     |   |
|   | [ dropdown: fetched from /api/tags ] [refresh button]     |   |
|   |                                                           |   |
|   | [!] Ollama must be running locally. JSON output quality    |   |
|   |     varies by model — recommend 7B+ parameter models.     |   |
|   +----------------------------------------------------------+   |
|                                                                   |
|   +------------------+   +-------------------+                    |
|   | Test Connection  |   | Save Settings     |                    |
|   +------------------+   +-------------------+                    |
|                                                                   |
|   [Connection status feedback area]                               |
|   e.g. "Connected to Ollama — 4 models available"                 |
|   e.g. "Gemini API key validated — model: gemini-2.5-flash"       |
|   e.g. "Error: Connection refused at localhost:11434"             |
|                                                                   |
+------------------------------------------------------------------+
```

**Visual styling:**
- Provider selector cards use `glass-card` class with `border-[#2A5F8C]` highlight on selected.
- Config panel uses `glass-panel` class.
- Input fields: `bg-[#2A2A2A] border-[#333333] text-white` with `focus:border-[#D4B980]`.
- Buttons: "Test Connection" uses `bg-[#2A5F8C]` (navy), "Save Settings" uses `bg-[#D4B980] text-[#1A1A1A]` (gold, primary action).
- Status feedback: green `#2E7D32` for success, `#F57C00` for warning, `#C62828` for error — matching existing CSS custom properties.

### First-Run / Empty-State Experience

When any view triggers an LLM call and no provider is configured (no `localStorage` settings AND no build-time `GEMINI_API_KEY` fallback):

1. The LLM call is **not attempted**.
2. A banner appears inline where the loading spinner would normally show:
   ```
   +-------------------------------------------------------+
   | [gear icon]  Intelligence Engine not configured.       |
   |              [Open Settings] to select Gemini or       |
   |              Ollama before generating.                 |
   +-------------------------------------------------------+
   ```
3. "Open Settings" is a clickable link that sets `step` to `'settings'`.
4. The banner uses `glass-panel` with a `border-l-4 border-[#D4B980]` left accent.

---

## 4. Architecture / Service Layer Refactor

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `services/llm/types.ts` | `LlmProvider` interface, `LlmSettings`, `ProviderId`, request/response shapes |
| 2 | `services/llm/geminiProvider.ts` | Wraps `@google/genai` SDK. Constructor takes `apiKey`. Implements `LlmProvider`. |
| 3 | `services/llm/ollamaProvider.ts` | Wraps `fetch()` to Ollama REST API. Constructor takes `baseUrl`, `model`. Implements `LlmProvider`. |
| 4 | `services/llm/index.ts` | Factory: `createProvider(settings: LlmSettings): LlmProvider`. Also exports `testConnection()`. |
| 5 | `services/llm/errors.ts` | `LlmError`, `LlmAuthError`, `LlmConnectionError`, `LlmParseError` — normalized error classes. |
| 6 | `services/settings/useSettings.ts` | `useSettings()` hook: reads/writes `localStorage` key `cl-intelligence-engine`, returns `[LlmSettings, setLlmSettings]`. |
| 7 | `services/settings/SettingsContext.tsx` | `SettingsProvider` and `useSettingsContext()` — React Context that wraps the app and broadcasts settings changes. |
| 8 | `views/SettingsView.tsx` | The Settings page UI component. |
| 9 | `components/ConfigureBanner.tsx` | The "Intelligence Engine not configured" inline banner. |

### Modified Files

| # | File | Change |
|---|------|--------|
| 1 | `services/geminiService.ts` | Refactor all 8 functions: replace `getClient()` + raw SDK calls with `getProvider().generateStructured(...)`. Rename to `services/agentService.ts`. |
| 2 | `App.tsx` | Add `'settings'` to step union. Wrap app in `SettingsProvider`. Add gear icon button to header. Render `SettingsView` when `step === 'settings'`. |
| 3 | `views/StartPage.tsx` | Update import path from `geminiService` to `agentService`. Add `ConfigureBanner` guard before LLM call. |
| 4 | `views/RequirementGathering.tsx` | Same import update + `ConfigureBanner` guard. |
| 5 | `views/DesignView.tsx` | Same import update + `ConfigureBanner` guard. |
| 6 | `views/ProjectPlanner.tsx` | Same import update + `ConfigureBanner` guard. |
| 7 | `types.ts` | No changes needed — domain types remain Gemini-agnostic (they already are). |

### Provider Interface Contract

```typescript
// services/llm/types.ts

export type ProviderId = 'gemini' | 'ollama';

export interface LlmSettings {
  provider: ProviderId;
  gemini?: {
    apiKey: string;
  };
  ollama?: {
    baseUrl: string;   // default "http://localhost:11434"
    model: string;     // e.g. "llama3.1", "mistral"
  };
}

export interface GenerateStructuredOpts {
  prompt: string;
  jsonSchema: object;         // JSON Schema object (provider adapts to its format)
  schemaDescription?: string; // Human-readable hint for prompt-based schema enforcement
}

export interface LlmProvider {
  generateStructured<T>(opts: GenerateStructuredOpts): Promise<T>;
  testConnection(): Promise<{ ok: boolean; detail: string }>;
}

export interface LlmConnectionTestResult {
  ok: boolean;
  detail: string;  // e.g. "4 models available" or "API key valid"
}
```

### Gemini Adapter Detail (`services/llm/geminiProvider.ts`)

- Constructor: `new GeminiProvider(apiKey: string)`.
- `generateStructured<T>(opts)`: Converts `opts.jsonSchema` (standard JSON Schema) into the `@google/genai` `Type`-based `responseSchema` format. Calls `ai.models.generateContent(...)` with `responseMimeType: 'application/json'`. Parses `response.text` as JSON, casts to `T`.
- `testConnection()`: Calls `ai.models.generateContent(...)` with a trivial prompt ("respond with `{\"ok\":true}`") and a minimal schema. Returns success if response parses.
- The `Type` enum mapping (`Type.STRING`, `Type.OBJECT`, etc.) is encapsulated entirely within this file.

### Ollama Adapter Detail (`services/llm/ollamaProvider.ts`)

- Constructor: `new OllamaProvider(baseUrl: string, model: string)`.
- `generateStructured<T>(opts)`: Calls `POST ${baseUrl}/api/generate` with body `{ model, prompt: buildOllamaPrompt(opts.prompt, opts.jsonSchema), format: 'json', stream: false }`. The `buildOllamaPrompt()` helper appends the JSON schema to the user prompt as a system instruction: `"You MUST respond with valid JSON matching this schema: ..."`. Parses response JSON field. If parse fails, throws `LlmParseError`.
- For Ollama >= 0.5 that supports `format: <json-schema-object>`, detect version from `/api/version` and use native schema enforcement when available. Fall back to prompt-based enforcement otherwise.
- `testConnection()`: Calls `GET ${baseUrl}/api/tags`. Returns model count and list.
- Static helper `listModels(baseUrl)`: Calls `GET ${baseUrl}/api/tags`, returns `string[]` of model names. Used by Settings UI to populate the model dropdown.

### Error Normalization (`services/llm/errors.ts`)

```typescript
export class LlmError extends Error {
  constructor(message: string, public provider: ProviderId, public cause?: unknown) {
    super(message);
  }
}
export class LlmAuthError extends LlmError {}       // bad API key, 401/403
export class LlmConnectionError extends LlmError {}  // network failure, ECONNREFUSED
export class LlmParseError extends LlmError {}       // response not valid JSON or schema mismatch
```

### Settings Persistence

- `localStorage` key: `"cl-intelligence-engine"`.
- Stored as JSON string of `LlmSettings`.
- `useSettings()` hook: reads on mount, writes on save. Exposes `[settings, saveSettings, isConfigured]`.
- `SettingsContext` wraps `<App>` so any component can call `useSettingsContext()` to get current settings without prop drilling.
- **Threat model:** API keys in `localStorage` are accessible to any JS on the same origin. This is acceptable for a local dev tool but NOT for a shared/public deployment. The Settings UI displays a warning: "Key stored in browser localStorage — not suitable for shared or public machines."

### Settings Context

```typescript
// services/settings/SettingsContext.tsx
const SettingsContext = createContext<{
  settings: LlmSettings | null;
  saveSettings: (s: LlmSettings) => void;
  isConfigured: boolean;
  setStep: (step: string) => void;  // to navigate to settings from ConfigureBanner
}>(...);
```

### Provider Factory

```typescript
// services/llm/index.ts
export function createProvider(settings: LlmSettings): LlmProvider {
  switch (settings.provider) {
    case 'gemini':
      return new GeminiProvider(settings.gemini!.apiKey);
    case 'ollama':
      return new OllamaProvider(settings.ollama!.baseUrl, settings.ollama!.model);
  }
}

// Used by agentService.ts:
export function getProvider(): LlmProvider {
  // 1. Read localStorage key "cl-intelligence-engine" synchronously.
  const raw = localStorage.getItem("cl-intelligence-engine");
  if (raw) {
    try {
      const settings: LlmSettings = JSON.parse(raw);
      return createProvider(settings);
    } catch {
      // Corrupted localStorage (manual edit, quota error, schema drift) —
      // treat as "no settings" and fall through to the env-var fallback.
    }
  }
  // 2. Fallback: if process.env.API_KEY exists, return GeminiProvider with that key.
  if (process.env.API_KEY) {
    return new GeminiProvider(process.env.API_KEY);
  }
  // 3. Neither configured — throw.
  throw new LlmError("No provider configured");
}
// NOTE: React Context (`SettingsContext`) is used only by the Settings UI page
// and `ConfigureBanner` component for live UI updates. Service-layer code reads
// `localStorage` directly. This decouples the service layer from React lifecycle
// and keeps Principle 2 (runtime-changeable without rebuild) honest.
```

### Refactored Domain Functions (`services/agentService.ts`)

Each function follows this pattern (example for `expandRequirements`):

```typescript
export const expandRequirements = async (
  category: RequirementCategory,
  currentItems: string[],
  context: ProjectRequirements
): Promise<SuggestionResponse> => {
  const provider = getProvider();

  const prompt = `...same prompt text as today...`;

  const schema = {
    type: "object",
    properties: {
      suggestions: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } }
    }
  };

  try {
    const result = await provider.generateStructured<{ suggestions: string[]; questions: string[] }>({
      prompt,
      jsonSchema: schema,
      schemaDescription: "Object with suggestions and questions arrays"
    });
    return {
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      questions: Array.isArray(result.questions) ? result.questions : []
    };
  } catch (error) {
    console.error("Error expanding requirements:", error);
    return { suggestions: ["Error generating suggestions."], questions: [] };
  }
};
```

**Per-function post-processing preservation:** Per-function post-processing logic remains in `agentService.ts`. Examples: the `format()` helper in `analyzeProjectAssets` (`geminiService.ts:62-68`) wraps raw strings into `{id, content}` objects; `normalizedNodes` in `generateArchitecture` (`geminiService.ts:303-313`) maps freeform string node types onto the `NodeType` enum with USER->HUMAN and DB/STORE->DATA fallbacks; `Array.isArray()` guards across multiple functions defend against malformed model output. **Only the raw LLM call is delegated to the provider.** All post-processing, normalization, type coercion, and error-recovery logic stays in the domain function unchanged. This guarantees output parity with the pre-refactor implementation.

The Gemini adapter converts the standard JSON Schema `{ type: "object", properties: {...} }` into the `@google/genai` `Type`-enum format internally. This conversion is a mechanical mapping and lives in a helper `toGeminiSchema()` inside `geminiProvider.ts`.

---

## 5. File-by-File Changelist

| # | Status | File | Purpose |
|---|--------|------|---------|
| 1 | NEW | `services/llm/types.ts` | `LlmProvider` interface, `LlmSettings`, `ProviderId`, `GenerateStructuredOpts` |
| 2 | NEW | `services/llm/errors.ts` | `LlmError`, `LlmAuthError`, `LlmConnectionError`, `LlmParseError` |
| 3 | NEW | `services/llm/geminiProvider.ts` | `GeminiProvider` class implementing `LlmProvider` with `toGeminiSchema()` helper |
| 4 | NEW | `services/llm/ollamaProvider.ts` | `OllamaProvider` class implementing `LlmProvider`, `listModels()` static helper |
| 5 | NEW | `services/llm/index.ts` | `createProvider()` factory, `getProvider()` with fallback logic |
| 6 | NEW | `services/settings/useSettings.ts` | `useSettings()` hook — localStorage read/write for `LlmSettings` |
| 7 | NEW | `services/settings/SettingsContext.tsx` | `SettingsProvider`, `useSettingsContext()` |
| 8 | NEW | `views/SettingsView.tsx` | Full Settings page: provider cards, config panels, test connection, save |
| 9 | NEW | `components/ConfigureBanner.tsx` | Inline "not configured" banner with "Open Settings" link |
| 10 | RENAME+MODIFY | `services/geminiService.ts` -> `services/agentService.ts` | Refactor all 8 functions to use `getProvider().generateStructured(...)` |
| 11 | MODIFY | `App.tsx` | Add `'settings'` step, wrap in `SettingsProvider`, add gear icon, render `SettingsView` |
| 12 | MODIFY | `views/StartPage.tsx` | Update import to `agentService`, add `ConfigureBanner` guard |
| 13 | MODIFY | `views/RequirementGathering.tsx` | Update import to `agentService`, add `ConfigureBanner` guard |
| 14 | MODIFY | `views/DesignView.tsx` | Update import to `agentService`, add `ConfigureBanner` guard |
| 15 | MODIFY | `views/ProjectPlanner.tsx` | Update import to `agentService`, add `ConfigureBanner` guard |

**Total: 9 new files, 1 rename+modify, 5 modifications = 15 files touched.**

---

## 6. Build Sequence (Phased)

### Phase 1: Types & Interfaces
- Create `services/llm/types.ts` (LlmProvider, LlmSettings, GenerateStructuredOpts, ProviderId).
- Create `services/llm/errors.ts` (error classes).
- **Acceptance:** Files compile with `tsc --noEmit`.

### Phase 2: Settings Persistence + Context
- Create `services/settings/useSettings.ts`.
- Create `services/settings/SettingsContext.tsx`.
- Modify `App.tsx` to wrap content in `<SettingsProvider>` and add `'settings'` to the step type.
- **Acceptance:** App compiles, `useSettingsContext()` returns null settings, existing workflow unchanged.

### Phase 3: Settings UI Page
- Create `views/SettingsView.tsx` with full layout (provider cards, config panels, save button).
- Add gear icon button to `App.tsx` header.
- Wire gear click to `setStep('settings')` and render `<SettingsView>` in main.
- **Acceptance:** Settings page renders, provider selection toggles, form saves to `localStorage`, can navigate back to workflow. No LLM calls wired yet.

### Phase 4: Gemini Adapter (Refactor Existing)
- Create `services/llm/geminiProvider.ts` with `toGeminiSchema()` helper.
- Create `services/llm/index.ts` with factory and `getProvider()`.
- Rename `services/geminiService.ts` to `services/agentService.ts`.
- Refactor all 8 functions to call `getProvider().generateStructured(...)`.
- Update all 4 view imports from `../services/geminiService` to `../services/agentService`.
- **Acceptance:** Existing Gemini flow works identically. All 8 functions produce the same JSON output. Build-time `API_KEY` still works as fallback.

### Phase 5: Ollama Adapter
- Create `services/llm/ollamaProvider.ts` with `listModels()`, `generateStructured()`, `testConnection()`.
- Wire model dropdown in `SettingsView.tsx` to `OllamaProvider.listModels()`.
- **Acceptance:** With Ollama running locally, selecting Ollama in settings + a model, then triggering `expandRequirements()` returns valid JSON suggestions.

### Phase 6: Connection Test UX
- Wire "Test Connection" button in `SettingsView.tsx` to `provider.testConnection()`.
- Display success/failure/detail in the status feedback area.
- **Acceptance:** Test Connection shows "Connected — N models available" for Ollama, "API key valid" for Gemini, or descriptive error on failure.

### Phase 7: First-Run Gating
- Create `components/ConfigureBanner.tsx`.
- Add banner guard to all 4 views before LLM call initiation.
- Banner's "Open Settings" navigates to settings page.
- **Acceptance:** With no settings and no build-time key, clicking "Generate Architecture" shows the banner instead of an error. Clicking "Open Settings" navigates to settings.

---

## 7. Provider Contract Details

### `generateStructured<T>` — Full Shape

```typescript
interface GenerateStructuredOpts {
  prompt: string;                 // The full prompt text
  jsonSchema: object;             // Standard JSON Schema (type, properties, items, required, etc.)
  schemaDescription?: string;     // Optional human-readable description for prompt injection
}

interface LlmProvider {
  generateStructured<T>(opts: GenerateStructuredOpts): Promise<T>;
  testConnection(): Promise<{ ok: boolean; detail: string }>;
}
```

### Gemini JSON Schema Mapping

The `toGeminiSchema()` helper maps standard JSON Schema to `@google/genai`'s `Type`-enum format:
- `{ type: "string" }` -> `{ type: Type.STRING }`
- `{ type: "object", properties: {...} }` -> `{ type: Type.OBJECT, properties: {...mapped...} }`
- `{ type: "array", items: {...} }` -> `{ type: Type.ARRAY, items: {...mapped...} }`
- `{ type: "integer" }` -> `{ type: Type.INTEGER }`
- `{ type: "number" }` -> `{ type: Type.NUMBER }`
- `required` arrays pass through.
- `enum` arrays pass through.
- `description` strings pass through.

This is a recursive tree walk, ~30 lines of code.

### Ollama JSON Schema Strategy

1. **Check Ollama version** (cached): `GET /api/version`. If >= 0.5.0, use `format: <json-schema-object>` in the generate request body (native JSON schema enforcement).
2. **Fallback** (< 0.5.0 or version check fails): Use `format: "json"` (JSON mode) and inject the schema into the prompt:
   ```
   ${originalPrompt}

   IMPORTANT: You MUST respond with valid JSON matching this exact schema:
   ${JSON.stringify(jsonSchema, null, 2)}

   Do not include any text outside the JSON object.
   ```
3. **Version cache:** Maintained at module scope in `ollamaProvider.ts`:
   ```typescript
   const versionCache = new Map<string, { version: string; fetchedAt: number }>();
   const VERSION_TTL_MS = 5 * 60 * 1000;
   ```
   Keyed by base URL. On each `generateStructured()` call, check the cache. On miss or expiry, fetch `GET ${baseUrl}/api/version`, store result. If `/api/version` itself fails, fall back to legacy `format: 'json'` behavior without retrying for the TTL window. Cache is invalidated implicitly when the user changes the base URL (different key) or explicitly when the user clicks "Test Connection" in Settings (the test re-fetches version).
4. **Parse response**: `JSON.parse(response.response)`. If parse fails, throw `LlmParseError`.
4. **No runtime validation library** in this iteration — we rely on the model following the schema (same trust level as current Gemini flow, which also does not validate beyond `JSON.parse`).

### Error Normalization

| Scenario | Gemini | Ollama | Normalized |
|----------|--------|--------|------------|
| Bad API key | 401/403 from SDK | N/A | `LlmAuthError` |
| Network down | SDK throws | `fetch` throws `TypeError` | `LlmConnectionError` |
| CORS blocked | N/A | `fetch` throws `TypeError` | `LlmConnectionError` with CORS hint |
| Bad JSON response | `JSON.parse` fails | `JSON.parse` fails | `LlmParseError` |
| Model not found | SDK error | 404 from Ollama | `LlmError("Model not found")` |

### Model Name Strategy

- **Gemini:** Hardcoded `'gemini-2.5-flash'` in this iteration. Displayed as read-only in settings.
- **Ollama:** User-selected from dropdown populated by `GET ${baseUrl}/api/tags` which returns `{ models: [{ name: "llama3.1:latest", ... }] }`. Stored as the full name string (e.g. `"llama3.1:latest"`).

---

## 8. Risks & Mitigations

### (a) Ollama CORS / Mixed-Content

**Risk:** Browser may block `fetch('http://localhost:11434/...')` from an `https://` origin (mixed content), or Ollama may not send CORS headers.
**Mitigation:** Ollama allows requests from `localhost` and `127.0.0.1` origins by default, which matches the dev server on `http://localhost:3000`. For any other origin (different host, HTTPS deployment, custom port not on localhost), users must set the `OLLAMA_ORIGINS` environment variable before starting Ollama (e.g., `OLLAMA_ORIGINS=http://192.168.1.10:3000` or `OLLAMA_ORIGINS=*` for permissive dev). HTTPS-served apps cannot reach `http://localhost:11434` due to mixed-content browser policy regardless of CORS settings; this is an out-of-scope limitation for this iteration. Document these constraints in the Ollama config panel help text.

### (b) API Key in localStorage Threat Model

**Risk:** Any JS on the same origin can read the key. XSS = key exfiltration.
**Mitigation:** Display warning in Settings UI. This is acceptable for a local developer tool. No CDN-hosted third-party scripts beyond Tailwind CDN (which is a read-only CSS utility). Document in the settings panel that keys should not be stored on shared machines.

### (c) Breaking Existing Flow During Refactor

**Risk:** Renaming `geminiService.ts` and rewriting 8 functions could introduce regressions.
**Mitigation:** Phase 4 preserves identical prompt text and identical JSON parsing. The refactor is mechanical: replace `ai.models.generateContent({...config})` with `provider.generateStructured({prompt, jsonSchema})`. The Gemini adapter reconstructs the exact same SDK call internally. Build-time key fallback ensures zero-config path still works.

### (d) Ollama JSON-Schema Parity Gap

**Risk:** Ollama models (especially smaller ones) may not reliably produce valid JSON matching complex schemas (e.g., nested objects with required fields, enum constraints).
**Mitigation:** (1) Recommend 7B+ parameter models in UI. (2) Prompt-based schema enforcement includes explicit "MUST respond with valid JSON." (3) Use native `format: <schema>` when Ollama version supports it. (4) Existing `Array.isArray()` guards in domain functions already handle malformed arrays. (5) `LlmParseError` gives clear user feedback when JSON fails to parse.

### (e) Latency / Response Size Differences

**Risk:** Local Ollama models may be significantly slower than Gemini API, especially on CPU-only machines.
**Mitigation:** Existing loading spinners in all views handle long waits. No hard timeouts added — user can always cancel navigation. Settings UI notes "Local models may be slower depending on hardware."

### (f) Vite `process.env.API_KEY` Build-Time Bake

**Risk:** The build-time key is still baked in via `vite.config.ts` `define`. Should it remain?
**Mitigation:** Keep it as a fallback. The `getProvider()` factory priority is: (1) `localStorage` user settings, (2) `process.env.API_KEY` build-time key (auto-creates a `GeminiProvider`), (3) null (triggers ConfigureBanner). This preserves backward compatibility and lets developers who set `GEMINI_API_KEY` in `.env` skip the settings page entirely.

---

## 9. Testable Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC1 | With no `localStorage` settings and no build-time `GEMINI_API_KEY`, every LLM-triggering action (Start with file, Expand, Completeness Check, Generate Architecture, Optimize, Simulate, Compare, Generate Plan) shows the "Configure your Intelligence Engine" banner instead of crashing. |
| AC2 | Switching from Gemini to Ollama in Settings (without page reload) causes the next `expandRequirements()` call to hit the Ollama endpoint. |
| AC3 | "Test Connection" returns success/failure within 10 seconds and reports model count for Ollama / model echo for Gemini. |
| AC4 | Existing flow with a build-time `GEMINI_API_KEY` (no Settings configuration) produces identical JSON output to today for all 8 domain functions, including the top-level `Type.ARRAY` schema used by `simulateAgentRun` and the deeply-nested 3-level schema used by `generateProjectPlan`. Verify by running each of the 8 functions with the same input pre- and post-refactor; the parsed JSON must match field-for-field. |
| AC5 | The Settings page renders correctly with glass-panel styling, gold/navy accent colors, and is navigable via the gear icon in the header. |
| AC6 | Ollama model dropdown populates from a running Ollama instance's `/api/tags` endpoint and displays an error if Ollama is not reachable. |
| AC7 | Settings persist across page reload (saved to `localStorage` key `cl-intelligence-engine`). |
| AC8 | The gear icon in the header shows gold (`#D4B980`) when on the settings page and muted gray (`#808080`) otherwise, matching existing nav styling. |
| AC9 | Navigating to Settings and back to a workflow step (e.g., Design Studio) preserves all in-memory state (requirements, nodes, edges). |
| AC10 | When Ollama returns malformed JSON, the domain function catches `LlmParseError` and surfaces the same graceful error as today (e.g., empty suggestions array, null architecture). |
| AC11 | The service layer is decoupled from React. Verify by code inspection that `services/llm/index.ts`, `services/agentService.ts`, `services/llm/geminiProvider.ts`, and `services/llm/ollamaProvider.ts` contain zero `react` / `react-dom` imports and no calls to `useContext`, `useState`, or other hooks. `getProvider()` must function purely from `localStorage` + `process.env.API_KEY` reads. |
| AC12 | When Ollama is running but the app's origin is not in `OLLAMA_ORIGINS`, `provider.testConnection()` returns an `LlmConnectionError` whose `detail` message includes a CORS-specific hint pointing the user to set `OLLAMA_ORIGINS`. Verify by setting `OLLAMA_ORIGINS=http://example.invalid` and running the test from `http://localhost:3000`. |

---

## 10. Verification Steps

### Dev Environment Setup

1. `cd C:\Users\reyno\Projects\CL_Intelligent_Orchestration`
2. `npm run dev` — app at `http://localhost:3000`
3. For Ollama testing: ensure Ollama is running (`ollama serve`) with at least one model pulled (e.g., `ollama pull llama3.1`).

### Manual Verification Checklist

**Settings Page Access:**
- [ ] Click gear icon in header -> Settings page renders.
- [ ] Click a workflow nav item (01 REQUIREMENTS) -> returns to workflow. Click gear again -> Settings page.
- [ ] Header gear icon is gold when on settings, gray otherwise.

**Gemini Configuration:**
- [ ] Select Gemini card -> API key input appears.
- [ ] Enter key -> click "Save Settings" -> reload page -> key persists (masked).
- [ ] Click "Test Connection" with valid key -> green "API key valid" message.
- [ ] Click "Test Connection" with invalid key -> red error message.

**Ollama Configuration:**
- [ ] Select Ollama card -> URL input + model dropdown appear.
- [ ] Model dropdown populates from running Ollama (click refresh).
- [ ] Select a model -> Save -> reload -> selection persists.
- [ ] Click "Test Connection" with Ollama running -> green "Connected — N models available."
- [ ] Stop Ollama -> click "Test Connection" -> red "Connection refused" error.

**Workflow Integration (Gemini):**
- [ ] Configure Gemini in settings -> go to Start -> enter project name + file -> click Start -> `analyzeProjectAssets` works.
- [ ] Go to Requirements -> click Expand on any category -> suggestions appear.
- [ ] Go to Design Studio -> Generate -> architecture appears.
- [ ] Generate Project Plan -> plan renders.

**Workflow Integration (Ollama):**
- [ ] Switch to Ollama in settings -> go to Requirements -> Expand -> suggestions appear (may be slower).
- [ ] Generate Architecture from Design Studio -> architecture renders with valid node types.

**First-Run Gating:**
- [ ] Clear `localStorage` (`localStorage.removeItem('cl-intelligence-engine')`) and remove build-time key.
- [ ] Reload -> go to Requirements -> click Expand -> "Configure your Intelligence Engine" banner appears.
- [ ] Click "Open Settings" in banner -> navigates to Settings page.

**Backward Compatibility:**
- [ ] Set `GEMINI_API_KEY` in `.env` file, clear `localStorage` settings, reload -> app works exactly as before with zero configuration needed.

**Mid-Session Provider Switch (covers AC2):**
- [ ] Configure Gemini in Settings -> Save -> go to Requirements -> click Expand on Goals -> verify suggestions render -> go to Settings -> switch to Ollama, select model, Save -> go back to Requirements -> click Expand on Processes -> verify the next call hits Ollama (check Network tab for `localhost:11434/api/generate`).

**CORS Failure Mode (covers AC12):**
- [ ] Stop Ollama. Start it with `OLLAMA_ORIGINS=http://example.invalid ollama serve`. In Settings, click "Test Connection" -> error message shows CORS hint mentioning `OLLAMA_ORIGINS`.

**State Preservation (covers AC9):**
- [ ] Add 3 items in Requirements -> click gear icon -> Settings page loads -> click any workflow nav item or "Save & Return" -> Requirements view re-renders with the 3 items still present.

---

## ADR: Architecture Decision Record

**Decision:** Implement Provider Strategy / Adapter pattern with a single `LlmProvider` interface and two implementations (Gemini, Ollama).

**Drivers:** (1) All 8 domain functions share an identical call pattern (prompt + schema -> JSON), making a unified interface natural. (2) Gemini's `Type`-enum schema format and Ollama's `format` field are fundamentally different representations of the same intent, requiring adapter encapsulation. (3) The app has no state library or routing, so minimal infrastructure (React Context + localStorage) is preferred over heavier solutions.

**Alternatives considered:**
- **Internal dispatch (Option B):** Rejected — 8 functions x 2 branches, poor maintainability, leaks SDK types.
- **Generic task runner (Option C):** Rejected — loses type-safe domain function signatures that views depend on.

**Why chosen:** Option A provides clean separation with minimal overhead. The uniform call pattern across all 8 functions means the adapter interface is simple (`generateStructured<T>`), not forced. Adding a third provider later requires one new file, not 8 function edits.

**Consequences:**
- 9 new files added to the codebase.
- `geminiService.ts` renamed to `agentService.ts` — all 4 view imports change.
- `@google/genai` SDK types are now confined to `services/llm/geminiProvider.ts` only.
- JSON Schema is defined in standard format (not Gemini `Type` enums) in each domain function.

**Follow-ups:**
- Consider adding model selection for Gemini (currently hardcoded to `gemini-2.5-flash`).
- Consider runtime JSON Schema validation (e.g., Ajv) for Ollama responses if quality issues emerge.
- Consider adding a streaming mode for long-running generation tasks.
- Evaluate whether `sessionStorage` is preferable to `localStorage` for API key storage in some deployment contexts.
