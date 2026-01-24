export type SkuFormValues = {
  displayName: string;
  unitType: string;
  price: string;
};

export type SkuFormErrors = {
  displayName?: string;
  unitType?: string;
  price?: string;
};

const VALID_UNIT_TYPES = new Set(["UNIDADE", "KG"]);

export function normalizeSkuPriceInput(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  const replaced = raw.replace(/,/g, ".");
  let cleaned = "";
  let hasDot = false;
  for (const ch of replaced) {
    if (ch >= "0" && ch <= "9") {
      cleaned += ch;
    } else if (ch === "." && !hasDot) {
      cleaned += ".";
      hasDot = true;
    }
  }
  if (cleaned.startsWith(".")) {
    cleaned = `0${cleaned}`;
  }
  return cleaned;
}

export function parseSkuPriceInput(value: string) {
  const raw = value.trim();
  if (raw.includes("-")) return null;
  const normalized = normalizeSkuPriceInput(value);
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return { value: parsed, normalized };
}

export function formatSkuPriceInput(value: string) {
  const parsed = parseSkuPriceInput(value);
  if (!parsed) return value.trim();
  return parsed.value.toFixed(2);
}

export function validateSkuFormValues(values: SkuFormValues) {
  const errors: SkuFormErrors = {};
  if (!values.displayName.trim()) {
    errors.displayName = "Informe o nome.";
  }
  if (!VALID_UNIT_TYPES.has(values.unitType)) {
    errors.unitType = "Selecione o tipo de venda.";
  }
  if (!parseSkuPriceInput(values.price)) {
    errors.price = "Informe um preco valido.";
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
