import { NodeData, Edge, ProjectRequirements } from '../../types';
import { DRAWIO_STYLES } from './styles';
import { getVertexStyle, getDefaultDimensions } from './mapping';
import { escapeXml } from './escape';
import { buildIdMap } from './ids';
import { DrawioExportResult } from './types';

const PAGE_MARGIN = 100;

export function compileDrawio(
  nodes: NodeData[],
  edges: Edge[],
  pattern?: { name: string; desc: string } | null,
  requirements?: ProjectRequirements,
): DrawioExportResult {
  const warnings: string[] = [];

  const nodeIdMap = buildIdMap(nodes.map((n) => n.id));
  const edgeIdMap = buildIdMap(edges.map((e) => e.id));

  // Coordinate normalization: if any node sits at negative x/y, translate the
  // whole graph so the top-left node lands at (PAGE_MARGIN, PAGE_MARGIN).
  // Without this, Draw.io renders nodes in negative page space (off-page).
  const minX = nodes.length ? Math.min(...nodes.map((n) => n.position.x)) : 0;
  const minY = nodes.length ? Math.min(...nodes.map((n) => n.position.y)) : 0;
  const offsetX = minX < 0 ? -minX + PAGE_MARGIN : 0;
  const offsetY = minY < 0 ? -minY + PAGE_MARGIN : 0;

  const cells: string[] = [
    '<mxCell id="0" />',
    '<mxCell id="1" parent="0" />',
  ];

  for (const node of nodes) {
    const id = nodeIdMap.get(node.id) ?? node.id;
    const dims = getDefaultDimensions(node.type);
    const width = node.width ?? dims.width;
    const height = node.height ?? dims.height;
    const x = node.position.x + offsetX;
    const y = node.position.y + offsetY;

    if (!node.label?.trim()) {
      warnings.push(`Node ${node.id} has an empty label.`);
    }

    let style = getVertexStyle(node.type);
    if (node.description && node.description.trim()) {
      // Draw.io style values are ;-delimited; collapse semicolons inside the
      // description so a value containing ';' or '=' does not truncate the
      // tooltip or inject a stray style key. XML escaping is applied once,
      // by the outer escapeXml on the whole style string below.
      const safeTooltip = node.description.replace(/[;=]/g, ' ');
      style = `${style};tooltip=${safeTooltip}`;
    }

    cells.push(
      `<mxCell id="${id}" value="${escapeXml(node.label ?? '')}" style="${escapeXml(style)}" vertex="1" parent="1">` +
        `<mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />` +
        `</mxCell>`,
    );
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const connectedNodeIds = new Set<string>();

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      warnings.push(`Edge ${edge.id} skipped: source node ${edge.source} not found.`);
      continue;
    }
    if (!nodeIds.has(edge.target)) {
      warnings.push(`Edge ${edge.id} skipped: target node ${edge.target} not found.`);
      continue;
    }

    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);

    const id = edgeIdMap.get(edge.id) ?? edge.id;
    const source = nodeIdMap.get(edge.source) ?? edge.source;
    const target = nodeIdMap.get(edge.target) ?? edge.target;
    const value = escapeXml(edge.label ?? '');
    const style = escapeXml(DRAWIO_STYLES.edge_default);

    cells.push(
      `<mxCell id="${id}" value="${value}" style="${style}" edge="1" parent="1" source="${source}" target="${target}">` +
        `<mxGeometry relative="1" as="geometry" />` +
        `</mxCell>`,
    );
  }

  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      warnings.push(`Node ${node.id} (${node.label}) is orphaned (no incident edges).`);
    }
  }

  const bounds = computeBounds(nodes, offsetX, offsetY);
  const pageWidth = Math.max(bounds.maxX + PAGE_MARGIN, 400);
  const pageHeight = Math.max(bounds.maxY + PAGE_MARGIN, 300);

  const pageName = escapeXml(requirements?.projectName?.trim() || 'Agentic System Blueprint');
  const diagramId = escapeXml(slugForDiagram(requirements?.projectName));
  const now = new Date().toISOString();
  const patternComment = pattern?.name
    ? `<!-- Orchestration pattern: ${escapeXml(pattern.name)} -->\n      `
    : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${now}" agent="AgenticSystemBuilder" version="24.0.0" type="device">
  <diagram id="${diagramId}" name="${pageName}">
    <mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">
      ${patternComment}<root>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  return {
    xml,
    warnings,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
}

function computeBounds(
  nodes: NodeData[],
  offsetX: number,
  offsetY: number,
): { maxX: number; maxY: number } {
  if (nodes.length === 0) return { maxX: 0, maxY: 0 };
  let maxX = 0;
  let maxY = 0;
  for (const node of nodes) {
    const dims = getDefaultDimensions(node.type);
    const width = node.width ?? dims.width;
    const height = node.height ?? dims.height;
    const right = node.position.x + offsetX + width;
    const bottom = node.position.y + offsetY + height;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }
  return { maxX, maxY };
}

function slugForDiagram(projectName?: string): string {
  const base = (projectName ?? 'agentic_system_blueprint')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  return base || 'agentic_system_blueprint';
}
