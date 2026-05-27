import { describe, it, expect } from 'vitest';
import { escapeXml } from '../escape';

describe('escapeXml', () => {
  it('escapes ampersand first to avoid double-encoding', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
  });

  it('escapes < and > as entities', () => {
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
  });

  it('escapes double and single quotes', () => {
    expect(escapeXml(`"hi" 'there'`)).toBe('&quot;hi&quot; &apos;there&apos;');
  });

  it('returns empty string unchanged', () => {
    expect(escapeXml('')).toBe('');
  });

  it('passes plain text through unchanged', () => {
    expect(escapeXml('Hello world 123')).toBe('Hello world 123');
  });

  it('handles all special characters in a single string', () => {
    expect(escapeXml(`<a href="x" data='y'>z & w</a>`)).toBe(
      '&lt;a href=&quot;x&quot; data=&apos;y&apos;&gt;z &amp; w&lt;/a&gt;',
    );
  });
});
