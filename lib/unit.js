const VALID_UNITS = ["KG", "UNIDADE", "CENTO"];
const VALID_LABELS = ["un", "cento", "kg", "kit"];

function normalizeUnitType(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw === "kg") return "KG";
  if (raw === "un" || raw === "unit" || raw === "unidade") return "UNIDADE";
  if (raw === "cento" || raw === "kit") return "CENTO";
  if (VALID_UNITS.includes(String(input))) return input;
  throw new Error(`Tipo de venda invalido: ${input}`);
}

function unitLabelFor(type) {
  const normalized = normalizeUnitType(type);
  if (normalized === "KG") return "kg";
  if (normalized === "CENTO") return "cento";
  return "un";
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
  normalizeUnitLabel,
};
