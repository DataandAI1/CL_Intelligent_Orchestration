import { ValidationIssue } from './types';

export function validateDrawioXml(xml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (typeof DOMParser === 'undefined') {
    issues.push({
      severity: 'error',
      message: 'DOMParser is not available in this environment.',
    });
    return issues;
  }

  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    issues.push({
      severity: 'error',
      message: `XML parse error: ${parseError.textContent?.trim() || 'unknown'}`,
    });
    return issues;
  }

  const root = doc.documentElement;
  if (!root || root.nodeName !== 'mxfile') {
    issues.push({
      severity: 'error',
      message: `Expected root element <mxfile>, got <${root?.nodeName ?? 'null'}>.`,
    });
    return issues;
  }

  const diagrams = root.getElementsByTagName('diagram');
  if (diagrams.length === 0) {
    issues.push({ severity: 'error', message: 'No <diagram> element found.' });
    return issues;
  }

  const mxGraphModel = diagrams[0].getElementsByTagName('mxGraphModel')[0];
  if (!mxGraphModel) {
    issues.push({ severity: 'error', message: 'No <mxGraphModel> element found inside <diagram>.' });
    return issues;
  }

  const graphRoot = mxGraphModel.getElementsByTagName('root')[0];
  if (!graphRoot) {
    issues.push({ severity: 'error', message: 'No <root> element found inside <mxGraphModel>.' });
    return issues;
  }

  const cells = Array.from(graphRoot.getElementsByTagName('mxCell'));
  const cellIds = new Set<string>();
  let hasZero = false;
  let hasOne = false;

  for (const cell of cells) {
    const id = cell.getAttribute('id');
    if (id) cellIds.add(id);
    if (id === '0') hasZero = true;
    if (id === '1' && cell.getAttribute('parent') === '0') hasOne = true;
  }

  if (!hasZero) {
    issues.push({ severity: 'error', message: 'Missing root cell with id="0".' });
  }
  if (!hasOne) {
    issues.push({ severity: 'error', message: 'Missing root cell with id="1" parent="0".' });
  }

  if (issues.some((i) => i.severity === 'error')) {
    return issues;
  }

  for (const cell of cells) {
    const id = cell.getAttribute('id') ?? '<unknown>';

    if (cell.getAttribute('vertex') === '1') {
      const geometry = cell.getElementsByTagName('mxGeometry')[0];
      const x = geometry?.getAttribute('x');
      const y = geometry?.getAttribute('y');
      const width = geometry?.getAttribute('width');
      const height = geometry?.getAttribute('height');

      if (!geometry || !isNumeric(x) || !isNumeric(y) || !isNumeric(width) || !isNumeric(height)) {
        issues.push({
          severity: 'warning',
          message: `Vertex cell ${id} is missing numeric x/y/width/height geometry.`,
          targetId: id,
        });
      }
    }

    if (cell.getAttribute('edge') === '1') {
      const source = cell.getAttribute('source');
      const target = cell.getAttribute('target');
      if (!source || !cellIds.has(source)) {
        issues.push({
          severity: 'warning',
          message: `Edge cell ${id} references unknown source "${source ?? '<none>'}".`,
          targetId: id,
        });
      }
      if (!target || !cellIds.has(target)) {
        issues.push({
          severity: 'warning',
          message: `Edge cell ${id} references unknown target "${target ?? '<none>'}".`,
          targetId: id,
        });
      }
    }
  }

  return issues;
}

function isNumeric(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === '') return false;
  return !Number.isNaN(Number(value));
}
