export function safeFilename(name: string | undefined, ext: 'md' | 'drawio'): string {
  const trimmed = (name ?? '').trim();
  const base = trimmed || 'Agentic_System_Blueprint';
  const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitized || 'Agentic_System_Blueprint'}.${ext}`;
}
