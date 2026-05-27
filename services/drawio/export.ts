import { NodeData, Edge, ProjectRequirements } from '../../types';
import { compileDrawio } from './compiler';
import { validateDrawioXml } from './validation';
import { safeFilename } from './filename';

export interface ExportOptions {
  /** Optional callback invoked with the compiled XML after validation passes and before the download is triggered. */
  onXml?: (xml: string, filename: string) => void;
}

export function exportDesignToDrawio(
  nodes: NodeData[],
  edges: Edge[],
  pattern?: { name: string; desc: string } | null,
  requirements?: ProjectRequirements,
  options?: ExportOptions,
): void {
  if (nodes.length === 0) {
    alert('Cannot export an empty canvas. Add at least one node first.');
    return;
  }

  const result = compileDrawio(nodes, edges, pattern, requirements);
  const issues = validateDrawioXml(result.xml);
  const errors = issues.filter((i) => i.severity === 'error');

  if (errors.length > 0) {
    alert(`Draw.io export failed validation:\n${errors.map((e) => `- ${e.message}`).join('\n')}`);
    return;
  }

  const warnings = [...result.warnings, ...issues.filter((i) => i.severity === 'warning').map((i) => i.message)];
  if (warnings.length > 0) {
    console.warn('[drawio export] Warnings:', warnings);
  }

  const filename = safeFilename(requirements?.projectName, 'drawio');

  if (options?.onXml) {
    try {
      options.onXml(result.xml, filename);
    } catch (err) {
      console.warn('[drawio export] onXml callback failed (non-blocking):', err);
    }
  }

  const blob = new Blob([result.xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
