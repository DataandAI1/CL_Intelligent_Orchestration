import { describe, it, expect } from 'vitest';
import { safeFilename } from '../filename';

describe('safeFilename', () => {
  it('appends the requested extension to a clean name', () => {
    expect(safeFilename('My_Project', 'drawio')).toBe('My_Project.drawio');
    expect(safeFilename('My_Project', 'md')).toBe('My_Project.md');
  });

  it('falls back to Agentic_System_Blueprint when name is undefined', () => {
    expect(safeFilename(undefined, 'drawio')).toBe('Agentic_System_Blueprint.drawio');
  });

  it('falls back when name is empty or only whitespace', () => {
    expect(safeFilename('', 'drawio')).toBe('Agentic_System_Blueprint.drawio');
    expect(safeFilename('   ', 'md')).toBe('Agentic_System_Blueprint.md');
  });

  it('replaces non-alphanumeric characters with underscore', () => {
    expect(safeFilename('My Project!', 'drawio')).toBe('My_Project_.drawio');
    expect(safeFilename('a/b\\c:d', 'md')).toBe('a_b_c_d.md');
  });

  it('preserves underscores and hyphens', () => {
    expect(safeFilename('my-project_v2', 'drawio')).toBe('my-project_v2.drawio');
  });
});
