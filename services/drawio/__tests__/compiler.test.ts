import { describe, it, expect } from 'vitest';
import { compileDrawio } from '../compiler';
import { NodeData, Edge, NodeType } from '../../../types';

function node(over: Partial<NodeData> = {}): NodeData {
  return {
    id: 'n1',
    type: NodeType.AGENT,
    label: 'Node One',
    position: { x: 100, y: 100 },
    ...over,
  };
}

describe('compileDrawio', () => {
  it('emits the required root cells', () => {
    const result = compileDrawio([node()], []);
    expect(result.xml).toContain('<mxCell id="0" />');
    expect(result.xml).toContain('<mxCell id="1" parent="0" />');
  });

  it('wraps output in mxfile > diagram > mxGraphModel', () => {
    const result = compileDrawio([node()], []);
    expect(result.xml).toMatch(/<mxfile[^>]*>/);
    expect(result.xml).toMatch(/<diagram[^>]*name="[^"]+"/);
    expect(result.xml).toMatch(/<mxGraphModel[^>]*pageWidth="\d+"/);
  });

  it('emits a vertex cell per NodeType with type-specific style', () => {
    const nodes: NodeData[] = [
      node({ id: 'a', type: NodeType.AGENT, label: 'A' }),
      node({ id: 't', type: NodeType.TOOL, label: 'T' }),
      node({ id: 'd', type: NodeType.DATA, label: 'D' }),
      node({ id: 'g', type: NodeType.GOAL, label: 'G' }),
      node({ id: 'h', type: NodeType.HUMAN, label: 'H' }),
    ];
    const result = compileDrawio(nodes, []);
    expect(result.xml).toContain('fillColor=#dae8fc'); // agent (after escapeXml on style? no — # is not escaped)
    expect(result.xml).toContain('fillColor=#d5e8d4'); // tool
    expect(result.xml).toContain('shape=cylinder'); // data
    expect(result.xml).toContain('shape=hexagon'); // goal
    expect(result.xml).toContain('shape=umlActor'); // human
    expect(result.stats.nodeCount).toBe(5);
  });

  it('emits edge cells with mapped source/target and edge=1', () => {
    const nodes = [node({ id: 'a' }), node({ id: 'b' })];
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b', label: 'flows' }];
    const result = compileDrawio(nodes, edges);
    expect(result.xml).toMatch(/edge="1"[^>]*source="a"[^>]*target="b"/);
    expect(result.xml).toContain('value="flows"');
    expect(result.stats.edgeCount).toBe(1);
  });

  it('warns and skips edges referencing unknown nodes', () => {
    const nodes = [node({ id: 'a' })];
    const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'ghost' }];
    const result = compileDrawio(nodes, edges);
    expect(result.warnings.some((w) => w.includes('target node ghost'))).toBe(true);
    expect(result.xml).not.toMatch(/source="a"[^>]*target="ghost"/);
  });

  it('warns about orphan nodes (no incident edges)', () => {
    const nodes = [node({ id: 'a', label: 'Orphan' })];
    const result = compileDrawio(nodes, []);
    expect(result.warnings.some((w) => w.includes('orphaned'))).toBe(true);
  });

  it('escapes XML special characters in labels', () => {
    const nodes = [node({ id: 'a', label: '<script>alert("x")</script>' })];
    const result = compileDrawio(nodes, []);
    expect(result.xml).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(result.xml).not.toContain('<script>');
  });

  it('appends tooltip to style when description is present', () => {
    const nodes = [node({ id: 'a', description: 'A helpful agent' })];
    const result = compileDrawio(nodes, []);
    expect(result.xml).toContain('tooltip=A helpful agent');
  });

  it('XML-escapes tooltip text exactly once (no double-encoding)', () => {
    const nodes = [node({ id: 'a', description: 'Tom & Jerry "fight" <here>' })];
    const result = compileDrawio(nodes, []);
    // Should appear as &amp; once, not &amp;amp;
    expect(result.xml).toContain('tooltip=Tom &amp; Jerry &quot;fight&quot; &lt;here&gt;');
    expect(result.xml).not.toContain('&amp;amp;');
  });

  it('replaces ; and = inside description so they do not break style parsing', () => {
    const nodes = [node({ id: 'a', description: 'a=b;c=d' })];
    const result = compileDrawio(nodes, []);
    expect(result.xml).toContain('tooltip=a b c d');
    expect(result.xml).not.toContain('tooltip=a=b');
  });

  it('normalizes negative coordinates so min becomes 100', () => {
    const nodes = [
      node({ id: 'a', position: { x: -50, y: -30 } }),
      node({ id: 'b', position: { x: 150, y: 200 } }),
    ];
    const result = compileDrawio(nodes, []);
    // offsetX = -(-50) + 100 = 150 → a.x = -50 + 150 = 100, b.x = 150 + 150 = 300
    // offsetY = -(-30) + 100 = 130 → a.y = -30 + 130 = 100, b.y = 200 + 130 = 330
    expect(result.xml).toMatch(/id="a"[^>]*>\s*<mxGeometry x="100" y="100"/);
    expect(result.xml).toMatch(/id="b"[^>]*>\s*<mxGeometry x="300" y="330"/);
  });

  it('uses default dimensions when node has no width/height', () => {
    const nodes = [node({ id: 'a', type: NodeType.AGENT })];
    const result = compileDrawio(nodes, []);
    expect(result.xml).toMatch(/width="220"\s+height="80"/);
  });

  it('respects explicit width/height on a node', () => {
    const nodes = [node({ id: 'a', width: 300, height: 150 })];
    const result = compileDrawio(nodes, []);
    expect(result.xml).toMatch(/width="300"\s+height="150"/);
  });

  it('uses projectName for diagram name when provided', () => {
    const result = compileDrawio(
      [node()],
      [],
      null,
      { projectName: 'My Project', goals: [], processes: [], useCases: [], technologies: [], dataSources: [], humanInTheLoop: [] },
    );
    expect(result.xml).toContain('name="My Project"');
  });
});
