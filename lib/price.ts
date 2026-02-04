export function getUnitPriceDecimals(unitType: string): number {
  return unitType === "UNIDADE" ? 4 : 2;
}

export function normalizeDecimalInput(value: string, maxDecimals: number): string {
  const raw = value.trim();
  if (!raw) return "";
  let output = "";
  let hasSeparator = false;
  let decimalsCount = 0;

  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      if (hasSeparator) {
        if (decimalsCount >= maxDecimals) continue;
        decimalsCount += 1;
      }
      output += ch;
      continue;
    }
    if ((ch === "," || ch === ".") && !hasSeparator) {
      hasSeparator = true;
      output += ",";
    }
  }

  if (output.startsWith(",")) {
    output = `0${output}`;
  }

  return output;
}

export function parseDecimalInput(value: string, maxDecimals: number) {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes("-")) return null;
  const normalized = raw.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const parts = normalized.split(".");
  if (parts[1] && parts[1].length > maxDecimals) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return { value: parsed, normalized };
}

export function formatDecimalDisplay(value: number, maxDecimals: number): string {
  return value.toFixed(maxDecimals).replace(".", ",");
}

export function roundToDecimals(value: number, maxDecimals: number): number {
  return Number(value.toFixed(maxDecimals));
}

export function normalizePriceValue(value: number, unitType: string): number {
  return roundToDecimals(value, getUnitPriceDecimals(unitType));
}
