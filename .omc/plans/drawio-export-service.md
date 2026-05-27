# Plan: Draw.io Export Service for DesignView Canvas

**Created:** 2026-05-26
**Status:** DRAFT - Pending consensus review
**Complexity:** MEDIUM
**Estimated scope:** ~8 new files, 1 modified file (DesignView.tsx)

---

## RALPLAN-DR Summary

### Principles

1. **Reuse existing canvas state** -- The canvas already holds positioned `NodeData[]` and `Edge[]` in memory. The export consumes these directly; no re-generation or LLM call is needed.
2. **Deterministic compiler, no LLM in the export path** -- The Draw.io XML is produced by pure TypeScript string compilation from structured data, following the doc's Section 32 principle: "LLM generates structured spec; application code compiles into XML."
3. **Validate before download** -- Use the browser's built-in `DOMParser` to parse and structurally verify the XML before triggering the download. Warnings are non-blocking; parse failures block.
4. **Adapt the doc's rules, not its stack** -- The reference doc targets a Next.js + Prisma + LLM pipeline. We extract only the XML compilation rules (Sections 8-15), style registry (Section 11), ID normalization (Section 14), and validation checks (Section 15.3) and implement them as pure client-side TypeScript modules.
5. **Zero new runtime dependencies -- dev/test tooling (vitest, jsdom) is acceptable and expected** -- XML escaping, ID normalization, string building, and DOMParser validation are all achievable with built-in browser APIs and vanilla TypeScript. Dev dependencies for testing do not affect the production bundle.

### Decision Drivers

1. **User has a canvas already** -- They want a file export, not a new generation pipeline. The canvas provides `nodes: NodeData[]`, `edges: Edge[]`, `detectedPattern`, and `requirements` -- all positioned and validated at design time.
2. **Repo is a Vite SPA, not Next.js** -- There is no backend, no database, no server API. All code must run client-side in the browser. The doc's backend pieces (API routes, Prisma, BullMQ, repair loop) do not apply.
3. **Must produce a file Draw.io accepts without manual edits** -- The `.drawio` file must open cleanly in https://app.diagrams.net with all vertices, connectors, labels, and metadata intact.

### Viable Options

#### Option A: Client-side TS compiler reusing existing nodes/edges (RECOMMENDED)

- **Pros:**
  - No new dependencies, no backend changes, no LLM cost.
  - Deterministic: same canvas always produces same XML.
  - Fast: string concatenation + DOMParser validation completes in single-digit milliseconds for typical graphs (5-30 nodes).
- **Cons:**
  - No diagram preview before download (user must open in Draw.io to see the result).
  - Layout is 1:1 from canvas coordinates, so the Draw.io view will mirror the canvas exactly -- no auto-beautification.
  - Manual maintenance of style registry if Draw.io changes its style format.

#### Option B: Build the doc's full MVP 2 (Next.js + LLM + DB + repair loop)

- **Pros:**
  - Full-featured: prompt-to-diagram generation, revision loop, version history.
  - Directly implements the reference doc.
- **Cons:**
  - Massive scope explosion: requires Next.js migration, Prisma setup, LLM orchestration pipeline, new UI panels.
  - User did NOT ask for this. They asked for an export button.
  - Breaks the existing Vite SPA architecture.
- **Verdict: INVALID.** Scope is 50x what was requested. The existing app already has the structured data; re-generating it through an LLM pipeline is unnecessary and architecturally backwards.

#### Option C: LLM generates XML directly from current canvas state

- **Pros:**
  - Could produce more "beautified" or annotated Draw.io output.
  - Leverages existing Gemini integration.
- **Cons:**
  - Adds latency and cost (LLM call per export).
  - Non-deterministic: same canvas could produce different XML each time.
  - Requires repair loop for LLM XML errors (the very thing the doc warns against in Section 32).
  - The canvas data is already structured -- there is nothing for the LLM to "understand" or "plan."
- **Verdict: INVALID.** The doc itself says (Section 32): "Do not rely on the LLM to directly generate perfect XML." We already have structured data; deterministic compilation is the correct path.

#### Option D: DiagramSpec intermediate layer (doc Section 8)

- **Pros:**
  - Provides a canonical intermediate representation decoupled from both the canvas model and Draw.io XML.
  - Would make adding future export targets (e.g., Mermaid, .vsdx) a matter of writing a new compiler from DiagramSpec.
- **Cons:**
  - `NodeData` and `Edge` are already simple, stable value objects. Adding an intermediate layer now introduces indirection with no consumer besides Draw.io.
  - `mapping.ts` already serves as the adapter layer between app types and Draw.io styles.
  - Premature abstraction: a second export target does not yet exist.
- **Verdict: DEFERRED.** NodeData/Edge are simple stable value objects and `mapping.ts` already provides the adapter layer. Defer until a second export target (e.g., Mermaid, .vsdx) justifies the abstraction.

**Surviving option: A.** Options B and C are invalidated for the reasons above. Option D is deferred as premature.

---

## Plan Overview

Add a client-side Draw.io XML compiler as a new `services/drawio/` module. The compiler takes the existing in-memory `NodeData[]`, `Edge[]`, `detectedPattern`, and `requirements` from DesignView and produces a valid `.drawio` XML string. Before triggering download, the XML is validated using the browser's `DOMParser` for structural correctness. The existing "Export Lattice Architecture Plan" button in DesignView is replaced with a dropdown (or two adjacent buttons) offering both "Export Markdown" and "Export Draw.io" options.

---

## File/Module Structure

All new files live under `services/drawio/` relative to the project root (alongside existing `services/agentService.ts` and `services/llm/`).

```
services/drawio/
  index.ts          -- Public API: re-exports exportDesignToDrawio()
  types.ts          -- DrawioExportResult, ValidationIssue, DrawioExportOptions
  escape.ts         -- escapeXml(value: string): string
  ids.ts            -- toDrawioId(id: string): string, deduplicateIds(ids: string[]): Map<string,string>
  styles.ts         -- DRAWIO_STYLES registry: NodeType -> style string, edge styles
  mapping.ts        -- nodeTypeToDrawioStyle(type: NodeType): string, nodeTypeDimensions(type: NodeType): {w,h}
  compiler.ts       -- compileDrawio(nodes, edges, pattern?, requirements?): DrawioExportResult
  validation.ts     -- validateDrawioXml(xml: string): ValidationIssue[]
  export.ts         -- exportDesignToDrawio(nodes, edges, pattern?, requirements?): void (orchestrates compile + validate + download)
```

**Purpose of each file:**

| File | Purpose |
|---|---|
| `types.ts` | Interface definitions for `DrawioExportResult`, `ValidationIssue`, `DrawioExportOptions`. No runtime code. |
| `escape.ts` | XML character escaping for `&`, `<`, `>`, `"`, `'`. Single pure function. Per doc Section 11.2. |
| `ids.ts` | Normalize arbitrary node/edge IDs into Draw.io-safe IDs (lowercase, alphanumeric + underscore/hyphen, no leading digit). Detect and suffix collisions. Per doc Section 14. |
| `styles.ts` | Central style registry mapping semantic types to Draw.io style strings. Per doc Section 11.1. Single source of truth for all style strings. |
| `mapping.ts` | Maps the app's `NodeType` enum (AGENT, TOOL, DATA, GOAL, HUMAN) to the style registry keys and provides default dimensions. Thin adapter between app types and drawio styles. |
| `compiler.ts` | Core compiler. Builds `mxCell` XML strings for vertices and edges, wraps in `mxGraphModel` + `diagram` + `mxfile`. Per doc Sections 10, 13. Returns `{ xml, warnings, stats }`. |
| `validation.ts` | Post-compilation XML validation using browser `DOMParser`. Checks: XML parses, root structure is `mxfile > diagram > mxGraphModel > root`, root contains cells 0 and 1, vertex cells have geometry, edge cells have source/target. Per doc Section 15.3. Returns `ValidationIssue[]`. |
| `export.ts` | Top-level orchestrator. Calls compiler, calls validator, triggers Blob download if XML parses. Shows `alert()` for empty canvas or fatal parse errors. Logs warnings to console. |
| `index.ts` | Barrel export: `export { exportDesignToDrawio } from './export'` plus types. |

---

## NodeType to Draw.io Style Mapping Table

| App NodeType | Draw.io Shape | Style Key | Fill Color | Stroke Color | Notes |
|---|---|---|---|---|---|
| `AGENT` | Rounded rectangle | `agent` | `#dae8fc` (light blue) | `#6c8ebf` | `rounded=1;fontStyle=1` (bold label). Represents AI agents. |
| `TOOL` | Rectangle | `tool` | `#d5e8d4` (light green) | `#82b366` | `rounded=0;whiteSpace=wrap;html=1`. Standard rectangle for tools/services. |
| `DATA` | Cylinder | `data_store` | `#fff2cc` (light yellow) | `#d6b656` | `shape=cylinder;boundedLbl=1;backgroundOutline=1;size=15`. Database/data shape. |
| `GOAL` | Hexagon | `goal` | `#f8cecc` (light red/pink) | `#b85450` | `shape=hexagon;perimeter=hexagonPerimeter2;fixedSize=1`. Distinct goal marker. |
| `HUMAN` | Actor (stickman) | `human` | `#e1d5e7` (light purple) | `#9673a6` | `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top`. Human-in-the-loop. |

**Edge Styles:**

| Edge Style | Draw.io Style String |
|---|---|
| `edge_default` | `endArrow=block;html=1;rounded=1;strokeWidth=2;strokeColor=#808080;fontColor=#B8B8B8;fontSize=10;` |
| `edge_dashed` | Same as default + `dashed=1;dashPattern=8 4;` (reserved for future governance/optional edges) |

**Edge routing fidelity note:** Edges use `mxGeometry relative="1"` and delegate routing to Draw.io's auto-router. Connector paths will visually differ from the canvas Bezier curves rendered by `ConnectionLine.tsx`. This is an accepted fidelity tradeoff -- Draw.io users can reroute edges manually after opening the file.

---

## Implementation Steps (Build Order)

### Step 1: Utility modules (escape.ts, ids.ts)

**Build:** `services/drawio/escape.ts` and `services/drawio/ids.ts`

**escape.ts signature:**
```ts
export function escapeXml(value: string): string
```
Replaces `&` -> `&amp;`, `<` -> `&lt;`, `>` -> `&gt;`, `"` -> `&quot;`, `'` -> `&apos;`. Order matters: `&` must be first.

**ids.ts signatures:**
```ts
export function toDrawioId(id: string): string
// Trims, lowercases, replaces non-[a-z0-9_-] with _, prepends "id_" if starts with digit.

export function buildIdMap(ids: string[]): Map<string, string>
// Runs toDrawioId on each, detects collisions, appends _2, _3 etc. Returns original->drawio ID map.
```

**Acceptance:** Pure functions, no side effects, no imports beyond TypeScript built-ins.

### Step 2: Style registry and mapping (styles.ts, mapping.ts)

**Build:** `services/drawio/styles.ts` -- exports `DRAWIO_STYLES` object with style strings per the table above.

**Build:** `services/drawio/mapping.ts` -- exports:
```ts
export function getVertexStyle(type: NodeType): string
// Uses a `switch` over NodeType with:
//   default: { const _exhaustive: never = type; throw new Error(`Unhandled NodeType: ${type}`); }
// This makes adding a new NodeType a compile-time error rather than a silent fallthrough.

export function getDefaultDimensions(type: NodeType): { width: number; height: number }
// Same exhaustive switch pattern. Returns default width/height.
// AGENT/TOOL/GOAL: 220x80. DATA: 120x80. HUMAN: 60x100 (actor is taller/narrower).
```

**Acceptance:** Each NodeType maps to a non-empty style string. Both functions use exhaustive `switch` with `never`-typed default -- adding a new NodeType without updating these functions causes a TypeScript compile error.

### Step 3: Types (types.ts)

**Build:** `services/drawio/types.ts`
```ts
export interface DrawioExportResult {
  xml: string;
  warnings: string[];
  stats: {
    nodeCount: number;
    edgeCount: number;
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  targetId?: string;
}

export interface DrawioExportOptions {
  pageTitle?: string;
  includeMetadata?: boolean;
}
```

### Step 4: Compiler (compiler.ts) -- core logic

**Build:** `services/drawio/compiler.ts`

**Signature:**
```ts
import { NodeData, Edge, NodeType, ProjectRequirements } from '../../types';

export function compileDrawio(
  nodes: NodeData[],
  edges: Edge[],
  pattern?: { name: string; desc: string } | null,
  requirements?: ProjectRequirements
): DrawioExportResult
```

**Internal logic:**

1. Build ID map from all node IDs and edge IDs using `buildIdMap`.
2. Initialize `cells: string[]` with root cells: `<mxCell id="0" />` and `<mxCell id="1" parent="0" />`.
3. For each node, emit a vertex `mxCell`:
   - `id` = mapped drawio ID
   - `value` = `escapeXml(node.label)`
   - `style` = `getVertexStyle(node.type)` with `tooltip=${escapeXml(node.description || '')}` appended to the style string (Draw.io style supports `tooltip=` for hover text)
   - Keep `mxCell` direct -- do NOT introduce `<UserObject>` wrappers
   - `vertex="1"` `parent="1"`
   - `mxGeometry`: `x` = `node.position.x`, `y` = `node.position.y`, `width` = `node.width || getDefaultDimensions(node.type).width`, `height` = `node.height || getDefaultDimensions(node.type).height`
4. For each edge, emit an edge `mxCell`:
   - `id` = mapped drawio ID
   - `value` = `escapeXml(edge.label || '')`
   - `style` = `DRAWIO_STYLES.edge_default`
   - `edge="1"` `parent="1"` `source` = mapped source ID, `target` = mapped target ID
   - `mxGeometry relative="1"`
   - If source or target ID not found in node ID map, push a warning (dangling endpoint) and skip the edge.
5. **Coordinate normalization step:** If any `node.position.x` or `node.position.y` is negative, compute `offsetX = -min(all node x) + 100` and `offsetY = -min(all node y) + 100`, then apply that offset to every vertex position before emitting `mxGeometry`. If all positions are non-negative, offsets are 0. Then compute `pageWidth`/`pageHeight` from the normalized bounding box (max x + max width + 100px margin, max y + max height + 100px margin). This prevents nodes dragged into negative canvas space from rendering off-page in Draw.io. *(Implementation note: add a code comment marking this as the coordinate normalization step and referencing Risk 4.)*
6. Wrap cells in `mxGraphModel` with computed `pageWidth`/`pageHeight`.
7. Wrap in `diagram` with `name` = `escapeXml(requirements?.projectName || 'Agentic System Blueprint')`.
8. Wrap in `mxfile` with `host="app.diagrams.net"`, `modified` = ISO timestamp, `agent="AgenticSystemBuilder"`, `version="24.0.0"`, `type="device"`.
9. Detect orphan nodes (nodes with no edges) and push warnings.
10. Return `{ xml, warnings, stats: { nodeCount, edgeCount } }`.

**Acceptance:** Given a non-empty `nodes`/`edges` array, returns a non-empty XML string. XML string starts with `<?xml` and contains `<mxfile`.

### Step 5: Validation (validation.ts)

**Build:** `services/drawio/validation.ts`

**Signature:**
```ts
export function validateDrawioXml(xml: string): ValidationIssue[]
```

**Checks (per doc Section 15.3):**

1. XML parses via `new DOMParser().parseFromString(xml, 'text/xml')`. If `parsererror` element found, return severity `error`.
2. Root element is `mxfile`.
3. Contains at least one `diagram` element.
4. `diagram` contains `mxGraphModel`.
5. `mxGraphModel` contains `root`.
6. `root` contains `mxCell` with `id="0"`.
7. `root` contains `mxCell` with `id="1"` and `parent="0"`.
8. Every vertex `mxCell` (with `vertex="1"`) has an `mxGeometry` child with numeric `x`, `y`, `width`, `height`.
9. Every edge `mxCell` (with `edge="1"`) has `source` and `target` attributes that reference existing cell IDs.

Checks 1-7 are `error` severity. Checks 8-9 are `warning` severity.

**Acceptance:** Returns empty array for valid XML. Returns at least one error for malformed XML (e.g., unclosed tag).

### Step 6: Export orchestrator (export.ts, index.ts)

**Build:** `services/drawio/export.ts`

**Signature:**
```ts
export function exportDesignToDrawio(
  nodes: NodeData[],
  edges: Edge[],
  pattern?: { name: string; desc: string } | null,
  requirements?: ProjectRequirements
): void
```

**Logic:**

1. If `nodes.length === 0`, call `alert('Cannot export an empty canvas. Add at least one node.')` and return.
2. Call `compileDrawio(nodes, edges, pattern, requirements)`.
3. Call `validateDrawioXml(result.xml)`.
4. If any validation issue has severity `error`, call `alert('Draw.io export failed validation: ' + issues.map(i => i.message).join('; '))` and return.
5. If warnings exist, log them to `console.warn`.
6. Create `Blob` with `type: 'application/xml'`.
7. Build filename using `safeFilename(requirements?.projectName, 'drawio')` (see Step 7 item 1 for the helper definition). Defaults to `Agentic_System_Blueprint.drawio` when no project name is set.
8. Trigger download using same `createElement('a')` + `URL.createObjectURL` pattern as existing `handleExport`.
9. Clean up object URL.

**Build:** `services/drawio/index.ts` -- barrel export:
```ts
export { exportDesignToDrawio } from './export';
export type { DrawioExportResult, ValidationIssue } from './types';
```

**Acceptance:** Calling `exportDesignToDrawio` with a non-empty valid canvas triggers a browser file download of a `.drawio` file.

### Step 7: UI wiring in DesignView.tsx

**Modify:** `views/DesignView.tsx`

**Changes:**

1. Add a shared filename helper (in DesignView.tsx or a local util):
   ```ts
   function safeFilename(name: string | undefined, ext: 'md' | 'drawio'): string {
     return `${(name || 'Agentic_System_Blueprint').replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
   }
   ```
   Update the existing markdown export's `a.download` to use `safeFilename(requirements?.projectName, 'md')` AND the new Draw.io export's filename to use `safeFilename(requirements?.projectName, 'drawio')`. This keeps both exports consistent.
2. Add import: `import { exportDesignToDrawio } from '../services/drawio';`
3. Add a new handler:
   ```ts
   const handleExportDrawio = () => {
     exportDesignToDrawio(nodes, edges, detectedPattern, requirements);
   };
   ```
4. Replace the single "Export Lattice Architecture Plan" button (lines ~636-641) with two adjacent buttons:

   ```tsx
   {/* Export Buttons */}
   <div className="flex gap-2">
     <button
       onClick={handleExport}
       className="flex-1 bg-[#333333] hover:bg-[#4A4A4A] text-[#E8E8E8] py-2 px-3 rounded-lg font-bold transition-colors text-[10px] uppercase tracking-wider border border-[#4A4A4A] flex items-center justify-center gap-1"
     >
       <span>MD</span> Export Markdown
     </button>
     <button
       onClick={handleExportDrawio}
       className="flex-1 bg-[#333333] hover:bg-[#4A4A4A] text-[#E8E8E8] py-2 px-3 rounded-lg font-bold transition-colors text-[10px] uppercase tracking-wider border border-[#4A4A4A] flex items-center justify-center gap-1"
     >
       <span>DIO</span> Export Draw.io
     </button>
   </div>
   ```

   Both buttons share the same visual weight. The previous single button is removed.

**Acceptance:** Two export buttons visible in the sidebar bottom panel. Each triggers its respective export.

---

## Validation Strategy

Validation happens in two layers:

**Layer 1: Compiler-level warnings (compiler.ts)**
- Dangling edge endpoints (edge references a node ID not in the nodes array) -- warning, edge skipped.
- Orphan nodes (nodes with zero edges) -- warning, node still included.
- Empty labels -- warning (node included with empty value attribute).
- ID collisions after normalization -- handled silently by `buildIdMap` with numeric suffixes.

**Layer 2: XML structural validation (validation.ts)**
- Uses browser `DOMParser` -- zero dependencies.
- Checks the required Draw.io XML skeleton: `mxfile > diagram > mxGraphModel > root > [cell 0, cell 1]`.
- Checks vertex geometry completeness and edge source/target reference integrity.
- Errors block download. Warnings are logged to console but do not block.

No external XML libraries are needed. `DOMParser` is available in all modern browsers and is synchronous.

---

## UI Wiring Change in DesignView

**Before (line ~636-641):**
Single button: "Export Lattice Architecture Plan" that calls `handleExport` (markdown only).

**After:**
Two adjacent buttons in a `flex` container within the same bottom panel `div`:
1. "Export Markdown" -- calls existing `handleExport()` (renamed for clarity in the button text only; function name unchanged).
2. "Export Draw.io" -- calls new `handleExportDrawio()`.

Both buttons are styled identically to the current export button but narrower (using `flex-1` to share the row). No dropdown menu is needed for two options -- two buttons are simpler and more discoverable.

The rest of the bottom panel (Simulate Architecture, Generate Project Plan) remains unchanged.

---

## Test Plan

### Unit Tests (Vitest)

No test runner is currently installed. The plan recommends adding `vitest` and `jsdom` as dev dependencies (`npm install -D vitest jsdom`) and creating a `services/drawio/__tests__/` directory. Note: `vitest.config.ts` must set `environment: 'jsdom'` (or each test file that uses `DOMParser`, such as `validation.test.ts`, must include `// @vitest-environment jsdom`) so that `DOMParser` is available in the test environment.

**Test file: `services/drawio/__tests__/escape.test.ts`**
- `escapeXml` handles `&`, `<`, `>`, `"`, `'` correctly.
- `escapeXml` handles empty string.
- `escapeXml` handles string with no special characters (passthrough).
- `escapeXml` handles string with all special characters combined.

**Test file: `services/drawio/__tests__/ids.test.ts`**
- `toDrawioId` lowercases and replaces spaces/special chars.
- `toDrawioId` prepends `id_` for leading digits.
- `toDrawioId` handles empty string.
- `buildIdMap` detects collisions and suffixes (`_2`, `_3`).
- `buildIdMap` with no collisions returns 1:1 mapping.

**Test file: `services/drawio/__tests__/compiler.test.ts`**
- Single AGENT node produces valid vertex `mxCell` with correct style.
- Each of the 5 NodeTypes produces a vertex with the correct shape/style.
- Edge produces `mxCell` with `edge="1"`, correct source/target.
- Edge with missing source generates warning and is omitted.
- Orphan node generates warning.
- Output contains `mxfile`, `diagram`, `mxGraphModel`, `root`, cells 0 and 1.
- Node positions map 1:1 from input to `mxGeometry` x/y.
- Node with `width`/`height` set uses those values; node without uses defaults.
- Labels with special XML characters are escaped in output.

**Test file: `services/drawio/__tests__/validation.test.ts`**
- Valid Draw.io XML returns empty issues array.
- Malformed XML (unclosed tag) returns error.
- XML missing `mxfile` root returns error.
- XML missing root cells 0/1 returns error.
- Vertex missing `mxGeometry` returns warning.
- Edge with nonexistent source/target returns warning.

### Manual Golden-File QA

Create 2-3 fixture files to verify end-to-end:

1. **Fixture: 5-node agent workflow** -- One AGENT, one TOOL, one DATA, one GOAL, one HUMAN connected linearly. Export `.drawio`, open in https://app.diagrams.net, verify all 5 shapes and 4 connectors appear with correct labels.
2. **Fixture: 15-node complex graph** -- Multiple agents, tools, data sources with branching connections. Verify layout matches canvas positions, no overlapping shapes, all connectors attached.
3. **Fixture: Edge cases** -- Node with label `<script>alert("xss")</script>`, node with `&` in label, empty edge label. Verify file opens in Draw.io without errors and labels render correctly escaped.

### End-to-End Verification (manual, required before merge)

1. Run `npm run dev`, navigate to DesignView.
2. Generate or manually create a canvas with at least 3 node types and 2+ edges.
3. Click "Export Draw.io". Confirm browser downloads a `.drawio` file.
4. Open the downloaded file at https://app.diagrams.net (or desktop Draw.io).
5. Verify: all nodes visible, correct shapes/colors, all connectors attached, labels readable.
6. Save in Draw.io and reopen -- confirm no data loss on round-trip.

---

## Acceptance Criteria

- [ ] Clicking "Export Draw.io" on a non-empty canvas downloads a file named `Agentic_System_Blueprint.drawio`.
- [ ] The downloaded file opens in https://app.diagrams.net without errors or warnings.
- [ ] Every node in `nodes` appears as a vertex shape in the Draw.io diagram.
- [ ] Every edge in `edges` appears as a connector with correct source and target shapes.
- [ ] Node shapes match the type mapping: AGENT = rounded rect (blue), TOOL = rectangle (green), DATA = cylinder (yellow), GOAL = hexagon (red/pink), HUMAN = actor (purple).
- [ ] Edge labels are visible on connectors in Draw.io.
- [ ] Node positions in Draw.io preserve relative spatial arrangement: if node A is above-left of node B on canvas, it is above-left in Draw.io. Absolute coordinates may differ due to negative-position normalization (Risk 4 mitigation).
- [ ] XML passes `DOMParser` parse and contains required root cells (`id="0"` and `id="1" parent="0"`).
- [ ] Labels containing `<`, `>`, `&`, `"`, `'` are escaped and render correctly in Draw.io.
- [ ] File size for a 20-node graph is under 50 KB.
- [ ] Clicking "Export Draw.io" on an empty canvas (zero nodes) shows an alert and does not trigger a download.
- [ ] Clicking "Export Markdown" still works identically to the current behavior.
- [ ] Both export buttons are visible in the DesignView sidebar bottom panel.
- [ ] The `detectedPattern` name and `requirements.projectName` appear in the `.drawio` file metadata (diagram name / page title).
- [ ] Console warnings are logged for orphan nodes and dangling edge endpoints but do not block download.

---

## Out of Scope (Explicit)

The following are deliberately excluded from this plan:

1. **LLM-based diagram generation from prompts** -- The canvas already has structured data. No LLM call is needed for export.
2. **Prompt input UI for diagram creation** -- Exists in the reference doc but is irrelevant; the app already has RequirementGathering and DesignView.
3. **Revision/chat loop for diagrams** -- No "revise diagram" feature. Export is one-shot from current canvas state.
4. **Version history / persistence** -- No DB, no saved versions. Export downloads a file; that is the artifact.
5. **Server APIs / backend endpoints** -- Pure client-side. No `/api/diagrams/*` routes.
6. **Prisma / database schema** -- No persistence layer.
7. **Repair loop** -- The input data is already validated structured objects, not LLM-generated JSON. No repair needed.
8. **Miro API integration** -- Users can manually import the `.drawio` file into Miro via Draw.io's documented path.
9. **`.vsdx` export** -- Requires Draw.io's export automation or a separate library. Out of scope.
10. **SVG/PNG preview or export** -- The user can use Draw.io itself for these.
11. **Layers/groups/swimlanes** -- The app's `NodeType` model does not have layers or groups. Nodes are flat with types. Future enhancement.
12. **Diagram preview before download** -- User opens the file in Draw.io to preview.
13. **Dagre/ELK.js auto-layout** -- Nodes already have positions from the canvas. No layout engine needed.
14. **`node.instructions` in Draw.io output** -- Code-level / agent-system data, not appropriate for a visual diagram. Instructions are runtime configuration, not diagrammatic information.
15. **`node.schema` in Draw.io output** -- Same rationale as instructions: schema definitions are code-level data that do not belong in a visual architecture diagram.

---

## Risks and Mitigations

### Risk 1: Draw.io rejects generated XML silently

**Likelihood:** Medium
**Impact:** High (user sees blank diagram)
**Cause:** Incorrect XML structure, unescaped characters, or unsupported style keys.
**Mitigation:** The validation step (Step 5) catches structural issues before download. The style registry uses only allowlisted style keys from the doc's Section 15.4. Manual golden-file QA (opening in Draw.io) is an explicit test step. Additionally, Draw.io is forgiving -- it auto-wraps bare `mxGraphModel` and ignores unknown style properties.

### Risk 2: ID collisions after normalization

**Likelihood:** Low (but possible with similar labels like "Data Source" and "data_source")
**Impact:** Medium (shapes merge or disappear in Draw.io)
**Cause:** `toDrawioId` normalizes different original IDs to the same string.
**Mitigation:** `buildIdMap` explicitly detects collisions and appends numeric suffixes (`_2`, `_3`). Unit test covers this case.

### Risk 3: HUMAN actor shape renders differently across Draw.io versions

**Likelihood:** Low
**Impact:** Low (cosmetic)
**Cause:** The `umlActor` shape is a UML-specific shape that may render slightly differently in older Draw.io versions or forks.
**Mitigation:** Fallback: if `umlActor` proves problematic in QA, switch HUMAN to a rounded rectangle with a person icon emoji in the label. The style registry makes this a one-line change.

### Risk 4: Nodes at negative canvas coordinates render off-page in Draw.io

**Likelihood:** Medium -- drag handler in DesignView.tsx (~line 359) applies no position clamping; users can drag nodes left/up past the origin.
**Impact:** High -- nodes invisible when file opens.
**Mitigation:** Coordinate normalization in `compiler.ts` (per Step 4 item 5). When any min coordinate is negative, translate all positions so `min_x` and `min_y` become 100. Pre-translation positions are preserved relatively. Documented in code comment.

---

## ADR: Architecture Decision Record

**Decision:** Implement Draw.io export as a client-side TypeScript string compiler with browser-native DOMParser validation.

**Drivers:** (1) Existing canvas provides complete positioned graph data. (2) No backend available. (3) Zero-dependency constraint for a lightweight SPA.

**Alternatives considered:**
- Full MVP 2 pipeline (Next.js + LLM + DB) -- rejected as massive scope overreach.
- LLM-generated XML from canvas state -- rejected as non-deterministic, costly, and counter to the reference doc's own engineering principle.
- DiagramSpec intermediate layer (doc Section 8) -- deferred. NodeData/Edge are simple stable value objects and `mapping.ts` already provides the adapter layer. Defer until a second export target (e.g., Mermaid, .vsdx) justifies the abstraction.

**Why chosen:** Deterministic compilation from structured data is the correct pattern per the reference doc's core principle (Section 32). It requires zero new dependencies, zero backend changes, and produces repeatable output.

**Consequences:** No diagram beautification beyond canvas positions. No preview. Users must open the file in Draw.io to see the result. Style updates require manual registry edits. Edge connector paths will visually differ from the canvas Bezier curves (Draw.io auto-router vs. ConnectionLine.tsx rendering); this is an accepted fidelity tradeoff.

**Follow-ups:**
- Consider adding a Draw.io embed preview (iframe) in a future iteration.
- Consider supporting layers/groups when the data model adds them.
- Consider adding `.vsdx` export if Miro import becomes a priority.
