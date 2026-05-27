import { describe, it, expect } from 'vitest';
import { validateDrawioXml } from '../validation';
import { compileDrawio } from '../compiler';
import { NodeData, Edge, NodeType } from '../../../types';

const sampleNode: NodeData = {
  id: 'a',
  type: NodeType.AGENT,
  label: 'A',
  position: { x: 100, y: 100 },
};

describe('validateDrawioXml', () => {
  it('returns empty issues for valid compiler output', () => {
    const { xml } = compileDrawio([sampleNode, { ...sampleNode, id: 'b', label: 'B' }], [
      { id: 'e1', source: 'a', target: 'b' } as Edge,
    ]);
    const issues = validateDrawioXml(xml);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('returns an error for malformed XML', () => {
    const issues = validateDrawioXml('<mxfile><diagram><unclosed></diagram></mxfile>');
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('returns an error when root element is not mxfile', () => {
    const issues = validateDrawioXml('<?xml version="1.0"?><wrong></wrong>');
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('mxfile'))).toBe(true);
  });

  it('returns an error when root cells 0 and 1 are missing', () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram><mxGraphModel><root>
  <mxCell id="x" />
</root></mxGraphModel></diagram></mxfile>`;
    const issues = validateDrawioXml(xml);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('id="0"'))).toBe(true);
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('id="1"'))).toBe(true);
  });

  it('warns about vertex missing geometry', () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram><mxGraphModel><root>
  <mxCell id="0" />
  <mxCell id="1" parent="0" />
  <mxCell id="v" vertex="1" parent="1" />
</root></mxGraphModel></diagram></mxfile>`;
    const issues = validateDrawioXml(xml);
    expect(issues.some((i) => i.severity === 'warning' && i.targetId === 'v')).toBe(true);
  });

  it('warns about edge referencing unknown source or target', () => {
    const xml = `<?xml version="1.0"?>
<mxfile><diagram><mxGraphModel><root>
  <mxCell id="0" />
  <mxCell id="1" parent="0" />
  <mxCell id="e" edge="1" parent="1" source="ghost" target="phantom"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;
    const issues = validateDrawioXml(xml);
    expect(issues.some((i) => i.message.includes('unknown source'))).toBe(true);
    expect(issues.some((i) => i.message.includes('unknown target'))).toBe(true);
  });
});
