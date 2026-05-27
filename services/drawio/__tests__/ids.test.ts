import { describe, it, expect } from 'vitest';
import { toDrawioId, buildIdMap } from '../ids';

describe('toDrawioId', () => {
  it('lowercases and replaces invalid characters with underscore', () => {
    expect(toDrawioId('My Node!')).toBe('my_node_');
  });

  it('prepends id_ when the result starts with a digit', () => {
    expect(toDrawioId('123abc')).toBe('id_123abc');
  });

  it('preserves hyphens and underscores', () => {
    expect(toDrawioId('node-foo_bar')).toBe('node-foo_bar');
  });

  it('trims surrounding whitespace before normalizing', () => {
    expect(toDrawioId('  spaced  ')).toBe('spaced');
  });

  it('returns empty string for empty input', () => {
    expect(toDrawioId('')).toBe('');
  });
});

describe('buildIdMap', () => {
  it('returns 1:1 mapping when there are no collisions', () => {
    const map = buildIdMap(['alpha', 'beta', 'gamma']);
    expect(map.get('alpha')).toBe('alpha');
    expect(map.get('beta')).toBe('beta');
    expect(map.get('gamma')).toBe('gamma');
  });

  it('suffixes colliding ids with _2, _3, ...', () => {
    const map = buildIdMap(['My Node', 'my-node', 'my_node']);
    const values = Array.from(map.values());
    expect(new Set(values).size).toBe(3);
    expect(values[0]).toBe('my_node');
    expect(values[1]).toBe('my-node');
    expect(values[2]).toBe('my_node_2');
  });

  it('handles three-way collisions', () => {
    const map = buildIdMap(['x!', 'x@', 'x#']);
    const values = Array.from(map.values());
    expect(values).toEqual(['x_', 'x__2', 'x__3']);
  });
});
