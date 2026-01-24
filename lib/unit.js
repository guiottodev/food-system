const VALID_UNITS = ["KG", "UNIDADE"];
const VALID_LABELS = ["un", "kg"];

function normalizeUnitType(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw === "kg") return "KG";
  if (raw === "un" || raw === "unit" || raw === "unidade") return "UNIDADE";
  if (VALID_UNITS.includes(String(input))) return input;
  throw new Error(`Tipo de venda invalido: ${input}`);
}

function unitLabelFor(type) {
  const normalized = normalizeUnitType(type);
  if (normalized === "KG") return "kg";
  return "un";
}

function getSkuDefaults(type) {
  const normalized = normalizeUnitType(type);
  const unitLabel = unitLabelFor(normalized);
  if (normalized === "KG") {
    return { minQty: 0.5, quantityStep: 0.05, unitLabel };
  }
  return { minQty: 1, quantityStep: 1, unitLabel };
}

function normalizeUnitLabel(label) {
  const value = String(label ?? "").trim().toLowerCase();
  if (!VALID_LABELS.includes(value)) {
    throw new Error(`Label de unidade invalido: ${label}`);
  }
  return value;
}

module.exports = {
  normalizeUnitType,
  unitLabelFor,
  getSkuDefaults,
  normalizeUnitLabel,
};
