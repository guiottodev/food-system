import {
  formatDecimalDisplay,
  getUnitPriceDecimals,
  normalizeDecimalInput,
  parseDecimalInput,
} from "@/lib/price";

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

export function normalizeSkuPriceInput(value: string, unitType: string) {
  const decimals = getUnitPriceDecimals(unitType);
  return normalizeDecimalInput(value, decimals);
}

export function parseSkuPriceInput(value: string, unitType: string) {
  const decimals = getUnitPriceDecimals(unitType);
  return parseDecimalInput(value, decimals);
}

export function formatSkuPriceInput(value: string, unitType: string) {
  const decimals = getUnitPriceDecimals(unitType);
  const parsed = parseDecimalInput(value, decimals);
  if (!parsed) return value.trim();
  return formatDecimalDisplay(parsed.value, decimals);
}

export function validateSkuFormValues(values: SkuFormValues) {
  const errors: SkuFormErrors = {};
  if (!values.displayName.trim()) {
    errors.displayName = "Informe o nome.";
  }
  if (!VALID_UNIT_TYPES.has(values.unitType)) {
    errors.unitType = "Selecione o tipo de venda.";
  }
  if (!parseSkuPriceInput(values.price, values.unitType)) {
    errors.price = "Informe um preco valido.";
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
