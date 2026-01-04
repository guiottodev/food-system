const VALID_UNITS = ["KG", "UNIDADE", "CENTO"];

function normalizeUnitType(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (raw === "kg") return "KG";
  if (raw === "un" || raw === "unit" || raw === "unidade") return "UNIDADE";
  if (raw === "cento") return "CENTO";
  if (VALID_UNITS.includes(String(input))) return input;
  throw new Error(`Tipo de venda invalido: ${input}`);
}

function unitLabelFor(type) {
  const normalized = normalizeUnitType(type);
  if (normalized === "KG") return "kg";
  if (normalized === "UNIDADE") return "un";
  return "cento";
}

module.exports = {
  normalizeUnitType,
  unitLabelFor,
};
