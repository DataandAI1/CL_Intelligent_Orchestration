export function toDrawioId(id: string): string {
  const normalized = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  return /^[0-9]/.test(normalized) ? `id_${normalized}` : normalized;
}

export function buildIdMap(ids: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();

  for (const original of ids) {
    const base = toDrawioId(original);
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    map.set(original, candidate);
  }

  return map;
}
