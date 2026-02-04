export function normalizeText(value: string): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeProductName(value: string): string {
  return normalizeText(value);
}

export function normalizeSkuDisplayName(value: string): string {
  return normalizeText(value);
}

export function normalizeSkuReference(value: string): string {
  return normalizeText(value);
}

export function normalizeAttributeName(value: string): string {
  return normalizeText(value);
}

export function formatSkuLabel(displayName: string, referencia?: string | null): string {
  if (!referencia) return displayName;
  return `${displayName} (REF: ${referencia})`;
}
