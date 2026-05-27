# MVP 2 Technical Build Instructions: Prompt to Draw.io XML for Miro-Editable Architecture Diagrams

## 1. Product Summary

**Product name placeholder:** LatticeCanvas / Agentic Diagram Studio / Prompt-to-Draw.io

**MVP 2 goal:** Build a web application that converts natural-language architecture prompts into valid `.drawio` files containing editable shapes, connectors, labels, swimlanes, and grouped architecture layers. Users can open the generated file in Draw.io / diagrams.net, export as VSDX when needed, and import the result into Miro as an editable diagram.

This MVP deliberately focuses on **structured editable diagram generation**, not image generation. The core asset is a validated Draw.io XML graph, generated from an internal diagram model.

---

## 2. Why MVP 2 Matters

MVP 1, “Prompt to Mermaid + SVG,” is fast and useful for lightweight technical diagrams. MVP 2 becomes more commercially interesting because Draw.io / diagrams.net provides a richer editable canvas model than Mermaid and has a workable path into Miro.

Miro currently supports importing diagrams from Draw.io, Lucidchart, and Microsoft Visio, with an important limitation: imported diagrams are imported into a **new Miro board**, not directly into an existing board. Editing is also one-way: edits made in Miro do not sync back to the original Draw.io file. See Miro’s Draw.io import documentation: <https://help.miro.com/hc/en-us/articles/11842913643538-Import-Draw-io-diagrams-to-Miro>.

Miro’s own diagramming guidance also notes that Draw.io / diagrams.net diagrams can be exported as `.vsdx` and imported into Miro. See: <https://help.miro.com/hc/en-us/articles/25275263961874-Miro-Diagrams>.

Draw.io supports AI-friendly diagram generation by accepting simplified XML such as a bare `<mxGraphModel>`, which Draw.io can wrap in `<mxfile>` and `<diagram>` automatically. For production, however, this MVP should output a full `.drawio` file with an explicit `<mxfile>` wrapper. See Draw.io’s AI file generation guidance: <https://www.drawio.com/doc/faq/ai-drawio-generation>.

---

## 3. MVP Feature Scope

### Included

1. Prompt input for architecture, process, system, data-flow, agent workflow, and capability diagrams.
2. Diagram-type selection or auto-detection.
3. Internal diagram JSON model.
4. Draw.io XML generation.
5. XML validation and repair loop.
6. Diagram preview.
7. Download `.drawio` file.
8. Optional export instruction panel for Miro.
9. Optional direct `.svg` / `.png` preview export for non-editable sharing.
10. Version history for generated diagram specs and XML.
11. “Revise diagram” chat loop.

### Not Included in MVP 2

1. Direct Miro board creation through the Miro API.
2. Real-time collaborative editing.
3. Full bidirectional sync between Miro and Draw.io.
4. Automatic import into an existing Miro board.
5. Full Visio generation engine.
6. Full enterprise governance / permissions layer.

### Optional Stretch

1. Export `.vsdx` using diagrams.net export automation.
2. Generate Miro board object JSON as a future MVP 3 artifact.
3. Upload source documents and generate diagrams from extracted architecture requirements.
4. Store reusable architecture patterns in a vector database.

---

## 4. Target User Flow

```text
User enters prompt
  ↓
System extracts intent, diagram type, entities, relationships, constraints
  ↓
System generates internal Diagram Spec JSON
  ↓
System validates Diagram Spec JSON
  ↓
System compiles Diagram Spec JSON into Draw.io XML
  ↓
System validates XML structure and Draw.io-specific requirements
  ↓
System renders preview
  ↓
User downloads .drawio
  ↓
User opens in Draw.io / diagrams.net
  ↓
User exports to .vsdx if desired
  ↓
User imports diagram into Miro
```

---

## 5. Recommended Technology Stack

### Frontend

- **Framework:** Next.js with React
- **Styling:** Tailwind CSS
- **Diagram preview:** iframe-based diagrams.net embed, SVG render, or server-generated preview image
- **State management:** Zustand or React context for simple MVP
- **Editor panel:** Monaco Editor for XML and JSON preview
- **Download:** Browser Blob download for `.drawio`

### Backend

- **Runtime:** Node.js / TypeScript
- **API:** Next.js Route Handlers or Fastify / Express
- **LLM orchestration:** OpenAI, Anthropic, Gemini, or model-router abstraction
- **Schema validation:** Zod
- **XML building:** `xmlbuilder2` or custom string builder with XML escaping
- **XML parsing / validation:** `fast-xml-parser`, `libxmljs2`, or `xmllint` via CLI
- **Graph layout:** ELK.js, Dagre, or custom layered layout
- **Persistence:** Postgres
- **ORM:** Prisma
- **Object storage:** S3-compatible storage or local filesystem for MVP

### Optional Infrastructure

- **Queue:** BullMQ / Redis for long diagram generation jobs
- **Observability:** Langfuse, OpenTelemetry, or simple request logs
- **Deployment:** Railway, Render, Fly.io, Vercel + separate worker service

---

## 6. Core Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│                            Frontend                              │
│                                                                  │
│  Prompt Panel  │ Diagram Type Selector │ Preview │ Export Panel   │
└──────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                         API Gateway                              │
│                                                                  │
│  /api/diagrams/generate                                          │
│  /api/diagrams/:id/revise                                        │
│  /api/diagrams/:id/download                                      │
│  /api/diagrams/:id/validate                                      │
└──────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Agentic Diagram Pipeline                       │
│                                                                  │
│  Intent Agent → Architecture Agent → Layout Agent → Compiler      │
│       ↓              ↓                    ↓             ↓         │
│  Prompt IR      Diagram Spec JSON     Positioned Spec   Draw.io XML│
└──────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Validation + Repair                          │
│                                                                  │
│  JSON Schema Validation → XML Validation → Draw.io Rules Check     │
│                       → Repair Loop if invalid                    │
└──────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                            Storage                               │
│                                                                  │
│  Diagram Prompt │ Diagram Spec │ Draw.io XML │ Versions │ Exports  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Agentic Pipeline Design

### 7.1 Intent Agent

**Responsibility:** Convert the raw user prompt into a structured intent object.

Extract:

- Diagram purpose
- Audience
- Diagram type
- Required systems
- Actors
- Layers
- Data flows
- Constraints
- Visual tone
- Missing assumptions

Example output:

```json
{
  "diagramPurpose": "Explain an agentic context ingestion platform for technical stakeholders",
  "audience": "CTO and engineering team",
  "diagramType": "layered_architecture",
  "visualTone": "technical_clean",
  "mustInclude": [
    "Document ingestion",
    "Parsing pipeline",
    "Context atom store",
    "Vector search",
    "Governance checks",
    "Agent orchestration",
    "Miro export"
  ],
  "assumptions": [
    "Use a layered left-to-right architecture layout",
    "Represent governance as a cross-cutting control layer"
  ]
}
```

### 7.2 Architecture Agent

**Responsibility:** Convert intent into a normalized graph model.

It should identify:

- Nodes
- Groups
- Layers
- Edges
- Edge labels
- Boundary boxes
- Cross-cutting controls
- Data stores
- Human actors
- External systems
- Risk or governance checkpoints

### 7.3 Layout Agent

**Responsibility:** Assign coordinates and dimensions.

Approaches:

1. **MVP-simple:** deterministic layered layout.
2. **Intermediate:** Dagre for directed graphs.
3. **Advanced:** ELK.js for compound diagrams and nested layers.

For MVP 2, use deterministic layout first. It is easier to debug, easier to validate, and produces predictable diagrams.

### 7.4 Style Agent

**Responsibility:** Map semantic node types into Draw.io styles.

Examples:

- `external_system` → rounded rectangle, dashed border
- `agent` → rounded rectangle with stronger fill
- `data_store` → cylinder or database shape
- `governance` → hexagon or shield-like style
- `human_actor` → actor icon or rounded card
- `process` → rectangle
- `decision` → rhombus

### 7.5 Draw.io Compiler

**Responsibility:** Convert positioned Diagram Spec JSON into valid Draw.io XML.

This should be deterministic code, not LLM-generated final XML whenever possible.

The LLM should produce the structured diagram spec. The application code should compile the spec into XML.

### 7.6 Validation Agent

**Responsibility:** Catch errors and optionally trigger repair.

Validation layers:

1. JSON schema validation.
2. Graph validation.
3. XML parse validation.
4. Draw.io structural validation.
5. Visual sanity validation.

---

## 8. Internal Diagram Spec JSON

The internal JSON representation is the source of truth. Do not make the `.drawio` XML the canonical model.

### 8.1 TypeScript Types

```ts
export type DiagramType =
  | "layered_architecture"
  | "system_context"
  | "flowchart"
  | "sequence_flow"
  | "swimlane"
  | "capability_map"
  | "agent_workflow"
  | "data_flow";

export type NodeType =
  | "actor"
  | "external_system"
  | "application"
  | "service"
  | "agent"
  | "data_store"
  | "queue"
  | "governance"
  | "process"
  | "decision"
  | "artifact"
  | "interface"
  | "unknown";

export type EdgeType =
  | "data_flow"
  | "control_flow"
  | "api_call"
  | "event"
  | "human_action"
  | "governance_check"
  | "dependency";

export interface DiagramSpec {
  id: string;
  title: string;
  description?: string;
  diagramType: DiagramType;
  audience?: string;
  canvas: CanvasSpec;
  layers: LayerSpec[];
  groups: GroupSpec[];
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  legend?: LegendItem[];
  notes?: DiagramNote[];
  metadata: DiagramMetadata;
}

export interface CanvasSpec {
  width: number;
  height: number;
  gridSize?: number;
  orientation: "left_to_right" | "top_to_bottom" | "radial" | "freeform";
}

export interface LayerSpec {
  id: string;
  label: string;
  order: number;
  description?: string;
  bounds?: Bounds;
  styleRef?: string;
}

export interface GroupSpec {
  id: string;
  label: string;
  nodeIds: string[];
  layerId?: string;
  bounds?: Bounds;
  styleRef?: string;
}

export interface NodeSpec {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  layerId?: string;
  groupId?: string;
  position?: Point;
  size?: Size;
  styleRef?: string;
  tags?: string[];
  properties?: Record<string, string | number | boolean>;
}

export interface EdgeSpec {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: EdgeType;
  styleRef?: string;
  waypoints?: Point[];
  properties?: Record<string, string | number | boolean>;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface LegendItem {
  label: string;
  type: string;
  styleRef: string;
}

export interface DiagramNote {
  id: string;
  text: string;
  targetId?: string;
}

export interface DiagramMetadata {
  createdAt: string;
  createdBy?: string;
  sourcePrompt: string;
  model?: string;
  version: number;
}
```

### 8.2 Minimal Diagram Spec Example

```json
{
  "id": "diagram_001",
  "title": "Prompt to Draw.io XML Architecture",
  "diagramType": "layered_architecture",
  "canvas": {
    "width": 1800,
    "height": 1100,
    "orientation": "left_to_right"
  },
  "layers": [
    {
      "id": "experience",
      "label": "Experience Layer",
      "order": 1
    },
    {
      "id": "generation",
      "label": "Generation Layer",
      "order": 2
    },
    {
      "id": "export",
      "label": "Export Layer",
      "order": 3
    }
  ],
  "groups": [],
  "nodes": [
    {
      "id": "prompt_ui",
      "label": "Prompt UI",
      "type": "interface",
      "layerId": "experience"
    },
    {
      "id": "diagram_agent",
      "label": "Diagram Planning Agent",
      "type": "agent",
      "layerId": "generation"
    },
    {
      "id": "drawio_compiler",
      "label": "Draw.io XML Compiler",
      "type": "service",
      "layerId": "export"
    }
  ],
  "edges": [
    {
      "id": "edge_001",
      "from": "prompt_ui",
      "to": "diagram_agent",
      "label": "prompt + constraints",
      "type": "control_flow"
    },
    {
      "id": "edge_002",
      "from": "diagram_agent",
      "to": "drawio_compiler",
      "label": "validated diagram spec",
      "type": "data_flow"
    }
  ],
  "metadata": {
    "createdAt": "2026-05-18T00:00:00.000Z",
    "sourcePrompt": "Create a Prompt to Draw.io XML architecture diagram",
    "version": 1
  }
}
```

---

## 9. Draw.io XML Model Basics

A production `.drawio` file commonly uses this structure:

```xml
<mxfile host="app.diagrams.net" modified="2026-05-18T00:00:00.000Z" agent="PromptToDrawioMVP" version="24.0.0" type="device">
  <diagram id="diagram_001" name="Page-1">
    <mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- vertices and edges go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Draw.io requires a root hierarchy where cells live under a parent cell. The standard root pattern is:

```xml
<mxCell id="0" />
<mxCell id="1" parent="0" />
```

Most diagram elements then use `parent="1"` unless they are nested in groups.

---

## 10. Draw.io Cell Generation Rules

### 10.1 Vertex Cell

A shape node should compile to an `mxCell` with `vertex="1"` and an `mxGeometry` child.

```xml
<mxCell id="node_prompt_ui" value="Prompt UI" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1">
  <mxGeometry x="120" y="160" width="220" height="80" as="geometry" />
</mxCell>
```

### 10.2 Edge Cell

A connector should compile to an `mxCell` with `edge="1"`, `source`, `target`, and edge geometry.

```xml
<mxCell id="edge_001" value="prompt + constraints" style="endArrow=block;html=1;rounded=0;" edge="1" parent="1" source="node_prompt_ui" target="node_diagram_agent">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### 10.3 Group / Layer Background Cell

A layer can be represented as a large rounded rectangle behind its child nodes.

```xml
<mxCell id="layer_experience" value="Experience Layer" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f8f9fa;strokeColor=#d0d7de;fontStyle=1;align=left;verticalAlign=top;spacingLeft=12;spacingTop=8;" vertex="1" parent="1">
  <mxGeometry x="80" y="80" width="520" height="900" as="geometry" />
</mxCell>
```

For MVP 2, avoid deeply nested Draw.io groups unless necessary. Background layer rectangles are easier to manage and are usually sufficient.

---

## 11. Style System

Create a central style registry so the compiler does not scatter style strings across the codebase.

### 11.1 Style Registry Example

```ts
export const drawioStyles = {
  layer: [
    "rounded=1",
    "whiteSpace=wrap",
    "html=1",
    "fillColor=#f8f9fa",
    "strokeColor=#d0d7de",
    "fontStyle=1",
    "align=left",
    "verticalAlign=top",
    "spacingLeft=12",
    "spacingTop=8"
  ].join(";"),

  agent: [
    "rounded=1",
    "whiteSpace=wrap",
    "html=1",
    "fillColor=#dae8fc",
    "strokeColor=#6c8ebf",
    "fontStyle=1"
  ].join(";"),

  service: [
    "rounded=1",
    "whiteSpace=wrap",
    "html=1",
    "fillColor=#d5e8d4",
    "strokeColor=#82b366"
  ].join(";"),

  data_store: [
    "shape=cylinder",
    "whiteSpace=wrap",
    "html=1",
    "boundedLbl=1",
    "backgroundOutline=1",
    "size=15",
    "fillColor=#fff2cc",
    "strokeColor=#d6b656"
  ].join(";"),

  external_system: [
    "rounded=1",
    "whiteSpace=wrap",
    "html=1",
    "dashed=1",
    "fillColor=#f5f5f5",
    "strokeColor=#666666"
  ].join(";"),

  governance: [
    "shape=hexagon",
    "perimeter=hexagonPerimeter2",
    "whiteSpace=wrap",
    "html=1",
    "fixedSize=1",
    "fillColor=#f8cecc",
    "strokeColor=#b85450"
  ].join(";"),

  edge_default: [
    "endArrow=block",
    "html=1",
    "rounded=0",
    "strokeWidth=2"
  ].join(";"),

  edge_governance: [
    "endArrow=block",
    "html=1",
    "rounded=0",
    "dashed=1",
    "strokeWidth=2"
  ].join(";")
};
```

### 11.2 XML Escaping

Always escape XML values:

```ts
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

---

## 12. Layout Engine

### 12.1 MVP Deterministic Layered Layout

For architecture diagrams, deterministic layout is often better than generic graph layout.

Recommended defaults:

```ts
const CANVAS = {
  width: 1800,
  height: 1100,
  marginX: 80,
  marginY: 80,
  layerGap: 40,
  nodeGapY: 40,
  nodeWidth: 220,
  nodeHeight: 80
};
```

Algorithm:

1. Sort layers by `order`.
2. Divide canvas width by number of layers.
3. Assign each layer a bounding rectangle.
4. Assign nodes to their layer.
5. Within each layer, stack nodes vertically.
6. Center nodes inside their layer.
7. Compute edge connections from source center-right to target center-left.
8. Add waypoints if an edge crosses more than one layer.

### 12.2 Pseudocode

```ts
export function applyLayeredLayout(spec: DiagramSpec): DiagramSpec {
  const layers = [...spec.layers].sort((a, b) => a.order - b.order);
  const layerWidth = Math.floor(
    (spec.canvas.width - CANVAS.marginX * 2 - CANVAS.layerGap * (layers.length - 1)) /
      layers.length
  );

  for (const [index, layer] of layers.entries()) {
    const x = CANVAS.marginX + index * (layerWidth + CANVAS.layerGap);
    const y = CANVAS.marginY;

    layer.bounds = {
      x,
      y,
      width: layerWidth,
      height: spec.canvas.height - CANVAS.marginY * 2
    };

    const nodes = spec.nodes.filter((node) => node.layerId === layer.id);
    const totalNodeHeight =
      nodes.length * CANVAS.nodeHeight + Math.max(0, nodes.length - 1) * CANVAS.nodeGapY;
    const startY = y + Math.max(100, (layer.bounds.height - totalNodeHeight) / 2);

    for (const [nodeIndex, node] of nodes.entries()) {
      node.size = {
        width: CANVAS.nodeWidth,
        height: CANVAS.nodeHeight
      };
      node.position = {
        x: x + (layerWidth - CANVAS.nodeWidth) / 2,
        y: startY + nodeIndex * (CANVAS.nodeHeight + CANVAS.nodeGapY)
      };
    }
  }

  return spec;
}
```

---

## 13. Draw.io XML Compiler

### 13.1 Compiler Interface

```ts
export interface DrawioCompileResult {
  xml: string;
  warnings: string[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    layerCount: number;
  };
}

export function compileDrawio(spec: DiagramSpec): DrawioCompileResult {
  const warnings: string[] = [];
  const cells: string[] = [];

  cells.push(`<mxCell id="0" />`);
  cells.push(`<mxCell id="1" parent="0" />`);

  for (const layer of spec.layers) {
    if (!layer.bounds) {
      warnings.push(`Layer ${layer.id} is missing bounds; skipping layer background.`);
      continue;
    }
    cells.push(compileLayerCell(layer));
  }

  for (const node of spec.nodes) {
    cells.push(compileNodeCell(node));
  }

  for (const edge of spec.edges) {
    cells.push(compileEdgeCell(edge));
  }

  const xml = wrapMxFile(spec, cells.join("\n"));

  return {
    xml,
    warnings,
    stats: {
      nodeCount: spec.nodes.length,
      edgeCount: spec.edges.length,
      layerCount: spec.layers.length
    }
  };
}
```

### 13.2 Compile Node

```ts
function compileNodeCell(node: NodeSpec): string {
  if (!node.position || !node.size) {
    throw new Error(`Node ${node.id} is missing position or size.`);
  }

  const id = toDrawioId(node.id);
  const value = escapeXml(node.label);
  const style = getStyleForNode(node);

  return `
<mxCell id="${id}" value="${value}" style="${escapeXml(style)}" vertex="1" parent="1">
  <mxGeometry x="${node.position.x}" y="${node.position.y}" width="${node.size.width}" height="${node.size.height}" as="geometry" />
</mxCell>`.trim();
}
```

### 13.3 Compile Edge

```ts
function compileEdgeCell(edge: EdgeSpec): string {
  const id = toDrawioId(edge.id);
  const source = toDrawioId(edge.from);
  const target = toDrawioId(edge.to);
  const value = escapeXml(edge.label ?? "");
  const style = getStyleForEdge(edge);

  return `
<mxCell id="${id}" value="${value}" style="${escapeXml(style)}" edge="1" parent="1" source="${source}" target="${target}">
  <mxGeometry relative="1" as="geometry" />
</mxCell>`.trim();
}
```

### 13.4 Wrap File

```ts
function wrapMxFile(spec: DiagramSpec, cellsXml: string): string {
  const now = new Date().toISOString();
  const pageWidth = spec.canvas.width;
  const pageHeight = spec.canvas.height;
  const pageName = escapeXml(spec.title || "Page-1");

  return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${now}" agent="PromptToDrawioMVP" version="24.0.0" type="device">
  <diagram id="${escapeXml(spec.id)}" name="${pageName}">
    <mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">
      <root>
${indent(cellsXml, 8)}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}
```

---

## 14. ID Rules

Draw.io IDs must be unique. Use stable deterministic IDs so revisions can preserve shape identity.

```ts
export function toDrawioId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, "_")
    .replace(/^([0-9])/, "id_$1");
}
```

Recommended ID conventions:

```text
node_prompt_ui
node_diagram_agent
node_drawio_compiler
edge_prompt_ui_to_diagram_agent
layer_experience
layer_generation
```

---

## 15. Validation Strategy

Validation is the key difference between a toy generator and a useful commercial product.

### 15.1 Diagram Spec Validation

Use Zod to validate the JSON returned by the LLM.

Required checks:

1. `title` exists.
2. `diagramType` is supported.
3. Every node has a unique `id`.
4. Every edge has a unique `id`.
5. Every edge `from` and `to` references an existing node.
6. Every node assigned to a layer references an existing layer.
7. Canvas dimensions are positive.
8. Labels are non-empty and below max character threshold.
9. No duplicate normalized Draw.io IDs.

### 15.2 Graph Validation

```ts
export function validateGraph(spec: DiagramSpec): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(spec.nodes.map((node) => node.id));
  const layerIds = new Set(spec.layers.map((layer) => layer.id));

  for (const edge of spec.edges) {
    if (!nodeIds.has(edge.from)) {
      issues.push({ severity: "error", message: `Edge ${edge.id} has missing source ${edge.from}` });
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({ severity: "error", message: `Edge ${edge.id} has missing target ${edge.to}` });
    }
  }

  for (const node of spec.nodes) {
    if (node.layerId && !layerIds.has(node.layerId)) {
      issues.push({ severity: "error", message: `Node ${node.id} references missing layer ${node.layerId}` });
    }
  }

  const connectedNodeIds = new Set<string>();
  for (const edge of spec.edges) {
    connectedNodeIds.add(edge.from);
    connectedNodeIds.add(edge.to);
  }

  for (const node of spec.nodes) {
    if (!connectedNodeIds.has(node.id)) {
      issues.push({ severity: "warning", message: `Node ${node.id} is orphaned.` });
    }
  }

  return issues;
}
```

### 15.3 XML Validation

Checks:

1. XML parses successfully.
2. Root element is `mxfile`.
3. There is at least one `diagram`.
4. There is one `mxGraphModel`.
5. `mxGraphModel` has `root`.
6. Root includes `mxCell id="0"` and `mxCell id="1" parent="0"`.
7. Vertex cells have `mxGeometry` with x/y/width/height.
8. Edge cells have valid source and target IDs.
9. XML values are escaped.
10. File size is below reasonable threshold.

### 15.4 Draw.io-Specific Rules

Draw.io can accept many style values, but invalid or unsupported styles can silently render badly. Maintain an allowlist of styles for MVP.

Recommended style allowlist:

```text
rounded
whiteSpace
html
fillColor
strokeColor
fontColor
fontStyle
align
verticalAlign
spacingLeft
spacingTop
shape
perimeter
fixedSize
size
boundedLbl
backgroundOutline
endArrow
startArrow
edgeStyle
rounded
dashed
strokeWidth
```

### 15.5 Validation Result Shape

```ts
export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code?: string;
  message: string;
  targetId?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
```

---

## 16. LLM Prompting Strategy

The LLM should generate the **Diagram Spec JSON**, not the final XML.

### 16.1 System Prompt for Diagram Spec Generation

```text
You are an expert software architecture diagram planner.
Your job is to convert a user's prompt into a strict DiagramSpec JSON object.
Do not generate Draw.io XML.
Do not include markdown.
Do not include comments.
Only output valid JSON matching the provided schema.

The diagram should be structurally useful, visually clear, and editable after compilation into Draw.io.
Prefer 5-12 nodes unless the user asks for detail.
Use layers for architecture diagrams.
Use clear labels under 40 characters.
Use edge labels under 50 characters.
If information is missing, make practical assumptions and include them in metadata.assumptions.
```

### 16.2 User Prompt Template

```text
Create a DiagramSpec JSON object for the following request.

User request:
{{USER_PROMPT}}

Preferred diagram type:
{{DIAGRAM_TYPE_OR_AUTO}}

Audience:
{{AUDIENCE_OR_DEFAULT}}

Output requirements:
- Include layers when diagramType is layered_architecture, agent_workflow, or data_flow.
- Include nodes with semantic types.
- Include edges with semantic types.
- Use clear labels.
- Do not assign x/y coordinates. Layout will be handled by the system.
- Return only JSON.
```

### 16.3 Repair Prompt

```text
The previous DiagramSpec JSON failed validation.

Validation errors:
{{VALIDATION_ERRORS}}

Original user request:
{{USER_PROMPT}}

Previous JSON:
{{INVALID_JSON}}

Return a corrected DiagramSpec JSON object only.
```

---

## 17. API Design

### 17.1 Generate Diagram

```http
POST /api/diagrams/generate
Content-Type: application/json
```

Request:

```json
{
  "prompt": "Create an agentic architecture diagram for a platform that generates Draw.io XML from prompts and imports into Miro.",
  "diagramType": "layered_architecture",
  "audience": "technical_executive",
  "style": "clean_technical",
  "options": {
    "includeLegend": true,
    "maxNodes": 12,
    "orientation": "left_to_right"
  }
}
```

Response:

```json
{
  "diagramId": "diagram_abc123",
  "status": "generated",
  "spec": {},
  "validation": {
    "valid": true,
    "issues": []
  },
  "exports": {
    "drawioUrl": "/api/diagrams/diagram_abc123/download?format=drawio",
    "jsonUrl": "/api/diagrams/diagram_abc123/download?format=json"
  }
}
```

### 17.2 Revise Diagram

```http
POST /api/diagrams/:id/revise
Content-Type: application/json
```

Request:

```json
{
  "instruction": "Make this more executive-friendly and add a governance checkpoint before export."
}
```

### 17.3 Validate Diagram

```http
POST /api/diagrams/:id/validate
```

Response:

```json
{
  "valid": true,
  "issues": []
}
```

### 17.4 Download Diagram

```http
GET /api/diagrams/:id/download?format=drawio
GET /api/diagrams/:id/download?format=json
GET /api/diagrams/:id/download?format=svg
```

---

## 18. Database Schema

### 18.1 Prisma Model

```prisma
model Diagram {
  id             String   @id @default(cuid())
  title          String
  prompt         String
  diagramType    String
  audience       String?
  style          String?
  specJson       Json
  drawioXml      String
  validationJson Json
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  versions       DiagramVersion[]
}

model DiagramVersion {
  id             String   @id @default(cuid())
  diagramId      String
  version        Int
  prompt         String
  revisionNote   String?
  specJson       Json
  drawioXml      String
  validationJson Json
  createdAt      DateTime @default(now())

  diagram        Diagram @relation(fields: [diagramId], references: [id])

  @@unique([diagramId, version])
}
```

---

## 19. Frontend UX Requirements

### 19.1 Main Screen

Sections:

1. Prompt input.
2. Diagram type selector.
3. Audience selector.
4. Generate button.
5. Diagram preview.
6. Export panel.
7. JSON / XML inspector tabs.
8. Validation status panel.
9. Revision prompt.

### 19.2 Diagram Type Selector

Options:

- Auto-detect
- Layered architecture
- System context
- Flowchart
- Agent workflow
- Data flow
- Swimlane
- Capability map

### 19.3 Export Panel Copy

Include explicit guidance:

```text
Export Path for Miro:
1. Download the .drawio file.
2. Open it in diagrams.net / Draw.io.
3. If using Miro's Draw.io import flow, import the Draw.io diagram into a new Miro board where supported.
4. Alternatively, export from Draw.io as .vsdx, then import the .vsdx into Miro.
5. Imported diagrams are editable in Miro, but edits do not sync back to the original Draw.io file.
```

### 19.4 Validation Panel

Show:

- Green: valid
- Yellow: warnings
- Red: errors

Example:

```text
Valid Draw.io XML
- 11 nodes
- 14 connectors
- 4 architecture layers
- 0 errors
- 2 warnings: two orphan note nodes
```

---

## 20. Preview Options

### Option A: diagrams.net Embed

Use diagrams.net embed mode to preview the generated XML in an iframe. This provides a realistic preview but requires careful handling of postMessage communication.

### Option B: SVG Rendering

Use the diagrams.net export service or a server-side rendering approach to generate an SVG preview. This is excellent for display but adds operational complexity.

### Option C: Lightweight Internal Preview

Render the internal Diagram Spec JSON using React SVG or a canvas library. This preview may differ slightly from Draw.io but is fast and controllable.

**Recommendation for MVP 2:** Start with Option C for reliability, then add diagrams.net embed preview as a stretch feature.

---

## 21. Miro Export / Import Guidance

### 21.1 Primary User Path

```text
Generated .drawio
  ↓
Open in Draw.io / diagrams.net
  ↓
Export as .vsdx if necessary
  ↓
Import into Miro using Miro's diagram import flow
```

Miro’s documentation states that Draw.io / diagrams.net diagrams can be imported and that Draw.io diagrams can also be exported as `.vsdx` for import into Miro. Relevant references:

- Draw.io import to Miro: <https://help.miro.com/hc/en-us/articles/11842913643538-Import-Draw-io-diagrams-to-Miro>
- Miro Diagrams import guidance: <https://help.miro.com/hc/en-us/articles/25275263961874-Miro-Diagrams>
- Miro supported file formats: <https://help.miro.com/hc/en-us/articles/360017731613-Supported-file-formats>

### 21.2 Important Product Warning

The app should clearly state:

```text
Miro import behavior may vary by plan, integration availability, file type, and workspace settings. Imported diagrams are editable in Miro, but changes made in Miro do not sync back to the source .drawio file.
```

### 21.3 Why Not SVG as Primary Path?

Miro supports SVG upload, but Miro’s supported file format documentation describes SVG as imported “as a solid image.” That means SVG is useful for visual fidelity but not ideal for editable Miro objects. See Miro supported file formats: <https://help.miro.com/hc/en-us/articles/360017731613-Supported-file-formats>.

---

## 22. Error Handling

### 22.1 Common Errors

| Error | Likely Cause | Fix |
|---|---|---|
| Invalid JSON from LLM | Model returned markdown or comments | Strip fences, retry with stricter prompt |
| Missing edge target | LLM referenced a nonexistent node | Repair Diagram Spec |
| Duplicate IDs | Normalized labels collided | Add deterministic suffix |
| XML parse failure | Unescaped characters | Escape all labels and style strings |
| Blank Draw.io canvas | Missing root cells or geometry | Ensure root hierarchy and coordinates |
| Bad layout | Too many nodes in one layer | Increase canvas or rebalance nodes |
| Miro import loses editability | Imported as image instead of diagram | Use Draw.io/VSDX import path, not SVG/PNG |

### 22.2 Generation Retry Policy

Recommended pipeline:

```text
Attempt 1: Generate Diagram Spec
  ↓
If invalid: repair prompt
  ↓
Attempt 2: Generate corrected Diagram Spec
  ↓
If still invalid: deterministic fallback diagram
  ↓
Return warnings to user
```

Do not let the LLM retry endlessly.

---

## 23. Security Considerations

1. Sanitize all user input before displaying in HTML.
2. Escape all XML values.
3. Do not allow arbitrary XML injection.
4. Set max prompt length.
5. Set max node and edge counts.
6. Rate-limit generation endpoints.
7. Store user-generated files with private access by default.
8. Do not include secrets in generated diagram labels.
9. Add tenant isolation before enterprise use.
10. Add audit logs for diagram generation and export.

---

## 24. Testing Plan

### 24.1 Unit Tests

Test:

- XML escaping
- ID normalization
- Style mapping
- Node compilation
- Edge compilation
- Layer compilation
- XML wrapping
- JSON schema validation
- Graph validation

### 24.2 Golden File Tests

Create fixture prompts and expected `.drawio` outputs.

Example fixtures:

1. Simple 5-node flowchart.
2. Layered architecture with 4 layers.
3. Agent workflow with governance checkpoint.
4. Data flow diagram with datastore.
5. Swimlane process diagram.

### 24.3 Integration Tests

1. Generate diagram from prompt.
2. Validate spec.
3. Compile XML.
4. Parse XML.
5. Download `.drawio`.
6. Open manually in Draw.io.
7. Import into Miro manually.
8. Confirm shapes and connectors remain editable.

### 24.4 Manual QA Checklist

For each generated diagram:

- Does the title appear?
- Are all layers visible?
- Are nodes readable?
- Are connectors attached?
- Are edge labels readable?
- Are any nodes overlapping?
- Does the file open in diagrams.net?
- Can the diagram be edited in Draw.io?
- Can it be imported into Miro through the documented flow?
- Does the Miro version remain editable?

---

## 25. Development Milestones

### Milestone 1: Skeleton App

Deliverables:

- Next.js app
- Prompt form
- Diagram type selector
- Generate button
- Stubbed response
- Download placeholder

### Milestone 2: Diagram Spec Generation

Deliverables:

- LLM prompt templates
- Zod schema
- JSON validation
- Repair loop
- Saved Diagram records

### Milestone 3: Deterministic Layout

Deliverables:

- Layered layout engine
- Node positioning
- Layer background positioning
- Basic edge routing

### Milestone 4: Draw.io XML Compiler

Deliverables:

- XML wrapper
- Vertex compiler
- Edge compiler
- Layer compiler
- Style registry
- XML escaping

### Milestone 5: Validation

Deliverables:

- Graph validation
- XML parse validation
- Draw.io structure validation
- Validation panel in UI

### Milestone 6: Download and Preview

Deliverables:

- `.drawio` download
- JSON download
- Basic visual preview
- XML inspector

### Milestone 7: Revision Loop

Deliverables:

- Revise prompt
- Versioned diagram spec
- Versioned Draw.io XML
- Diffable history

### Milestone 8: Miro Export Guidance

Deliverables:

- Export instruction panel
- Miro import guidance
- Known limitations
- Manual QA checklist

---

## 26. Commercially Interesting Differentiators

### 26.1 Diagram Quality Scoring

Add an automated score:

```text
Architecture Completeness: 82%
Visual Clarity: 91%
Miro Import Readiness: 96%
Governance Coverage: 72%
```

### 26.2 Multi-View Generation

Generate related views from one source prompt:

1. Executive architecture map.
2. Technical component diagram.
3. Data flow diagram.
4. Agent workflow diagram.
5. Miro workshop board.

### 26.3 Diagram Refactoring

Allow prompts like:

```text
Make this less crowded.
Turn this into a swimlane.
Add a governance layer.
Create a CTO version.
Show only the agent orchestration layer.
Add observability and evaluation loops.
```

### 26.4 Architecture Pattern Library

Store reusable patterns:

- RAG architecture
- Agent orchestration
- Context ingestion
- Human-in-the-loop review
- Evaluation pipeline
- Data governance
- Event-driven architecture
- Contact center AI architecture
- Renewal intelligence platform

### 26.5 Source-Grounded Diagrams

Future feature:

```text
Upload PRD / architecture doc / transcript
  ↓
Extract systems and flows
  ↓
Generate diagram
  ↓
Cite which source lines produced which nodes
```

---

## 27. Recommended Repo Structure

```text
prompt-to-drawio/
  apps/
    web/
      app/
      components/
      lib/
      styles/
  packages/
    diagram-core/
      src/
        types.ts
        schema.ts
        validation/
        layout/
        styles/
        compiler/
        examples/
    llm-orchestration/
      src/
        prompts/
        generateDiagramSpec.ts
        repairDiagramSpec.ts
    storage/
      prisma/
      src/
  tests/
    fixtures/
    golden/
  docs/
    miro-import-guide.md
    drawio-xml-notes.md
```

---

## 28. Implementation Order for a Small Team

### Developer 1: Core Compiler

1. Define Diagram Spec types.
2. Build style registry.
3. Build XML compiler.
4. Add XML validation.
5. Create fixture diagrams.

### Developer 2: LLM + Validation

1. Build generation prompt.
2. Build repair prompt.
3. Add Zod validation.
4. Add graph validation.
5. Add retries and fallback.

### Developer 3: Frontend

1. Build prompt UI.
2. Build preview panel.
3. Build export panel.
4. Build validation display.
5. Build revision flow.

### Developer 4, Optional: Preview + QA

1. Build visual preview.
2. Test Draw.io import.
3. Test Miro import path.
4. Create demo examples.

---

## 29. Definition of Done

MVP 2 is done when:

1. A user can enter a prompt and generate a valid Diagram Spec JSON.
2. The system compiles the spec into a `.drawio` file.
3. The `.drawio` file opens in diagrams.net.
4. Shapes and connectors are editable in Draw.io.
5. The user can follow the documented path to import into Miro.
6. The UI shows validation status.
7. The user can revise the diagram with natural language.
8. Diagram versions are saved.
9. At least five demo prompts generate usable diagrams.
10. Manual QA confirms the Miro import path works under the documented constraints.

---

## 30. Demo Prompts

### Prompt 1: Agentic Architecture

```text
Create a layered architecture diagram for an agentic diagram creator app. Include prompt intake, intent extraction, diagram planning agent, layout engine, Draw.io XML compiler, validation agent, preview, and Miro export path.
```

### Prompt 2: Context Platform

```text
Create a technical architecture diagram for a Context Lattice platform with ContextCapture, ContextBuilder, ContextCurator, Library, context atom store, vector search, governance scoring, and agent work packet generation.
```

### Prompt 3: Data Flow

```text
Create a data flow diagram showing how uploaded PDFs, DOCX files, videos, and audio are parsed, chunked, embedded, governed, stored, retrieved, and used by AI agents.
```

### Prompt 4: Agent Workflow

```text
Create an agent workflow diagram for a system where a planner agent, architecture agent, layout agent, validation agent, and export agent collaborate to produce a diagram.
```

### Prompt 5: Miro Import Path

```text
Create a process diagram showing how a generated .drawio file moves from the application to Draw.io, then to VSDX export, then into Miro as an editable imported diagram.
```

---

## 31. Future MVP 3 Bridge

MVP 2 should prepare for direct Miro generation later. The internal Diagram Spec JSON should be designed so it can compile into both Draw.io XML and Miro board items.

Miro’s developer API supports board items and connectors, but not every board item is supported programmatically. Miro’s connector documentation describes connectors as board elements that connect two items and can include captions and connection points. See: <https://developers.miro.com/docs/connector_intro> and <https://developers.miro.com/docs/work-with-connectors>.

Future compilers:

```text
Diagram Spec JSON
  ├─ Draw.io XML compiler
  ├─ Mermaid compiler
  ├─ SVG compiler
  ├─ Miro REST object compiler
  └─ PowerPoint compiler
```

The product should treat Draw.io XML as an output target, not the permanent internal source of truth.

---

## 32. Key Engineering Principle

The most important architectural decision is this:

```text
LLM generates structured Diagram Spec JSON.
Application code compiles that spec into Draw.io XML.
Validation gates every step.
```

Do **not** rely on the LLM to directly generate perfect XML as the primary path. Direct XML generation can work for prototypes, but a commercial product needs deterministic compilation, stable IDs, versioning, validation, and repeatable layouts.

---

## 33. Build Checklist

```text
[ ] Create DiagramSpec TypeScript types
[ ] Create Zod schema
[ ] Create prompt templates
[ ] Create LLM generation function
[ ] Create repair function
[ ] Create deterministic layered layout
[ ] Create Draw.io style registry
[ ] Create XML escape utility
[ ] Create node compiler
[ ] Create edge compiler
[ ] Create layer compiler
[ ] Create mxfile wrapper
[ ] Create graph validator
[ ] Create XML parser validator
[ ] Create download endpoint
[ ] Create frontend prompt UI
[ ] Create preview panel
[ ] Create validation panel
[ ] Create revision UI
[ ] Create version persistence
[ ] Create demo prompts
[ ] Manually test in Draw.io
[ ] Manually test Miro import path
[ ] Document known import limitations
```

---

## 34. Reference Links

- Miro Draw.io import documentation: <https://help.miro.com/hc/en-us/articles/11842913643538-Import-Draw-io-diagrams-to-Miro>
- Miro diagram import guidance: <https://help.miro.com/hc/en-us/articles/25275263961874-Miro-Diagrams>
- Miro supported file formats: <https://help.miro.com/hc/en-us/articles/360017731613-Supported-file-formats>
- Miro connector documentation: <https://developers.miro.com/docs/connector_intro>
- Miro board item documentation: <https://developers.miro.com/docs/board-items>
- Draw.io AI file generation guidance: <https://www.drawio.com/doc/faq/ai-drawio-generation>
- Draw.io style reference for AI file generation: <https://www.drawio.com/doc/faq/drawio-style-reference>
- Draw.io import/export notes: <https://www.drawio.com/blog/import>
- GenAI-DrawIO-Creator research paper: <https://arxiv.org/abs/2601.05162>
