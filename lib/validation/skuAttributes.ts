export type SkuAttributeInput = { key: string; value: string };

type ValidationOk = {
  ok: true;
  normalized: SkuAttributeInput[];
  json: string;
};

type ValidationError = { ok: false; error: string };

export function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateSkuAttributes(
  attrs: SkuAttributeInput[]
): ValidationOk | ValidationError {
  const normalized: SkuAttributeInput[] = [];
  const seen = new Set<string>();

  for (const attr of attrs) {
    const rawKey = String(attr?.key ?? "").trim();
    const rawValue = String(attr?.value ?? "").trim();

    if (!rawKey && !rawValue) {
      continue;
    }

    if (!rawKey || !rawValue) {
      return {
        ok: false,
        error: "Preencha chave e valor para cada atributo.",
      };
    }

    const key = normalizeKey(rawKey);
    if (!key) {
      return { ok: false, error: "Chave de atributo invalida." };
    }

    if (seen.has(key)) {
      return { ok: false, error: "Chaves de atributo duplicadas." };
    }

    normalized.push({ key, value: rawValue });
    seen.add(key);

    if (normalized.length > 15) {
      return { ok: false, error: "Limite de 15 atributos por SKU." };
    }
  }

  return { ok: true, normalized, json: JSON.stringify(normalized) };
}
