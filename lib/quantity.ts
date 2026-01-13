export type QtyUnitType = "KG" | "UNIDADE";

type QtyResult =
  | { ok: true; normalized: number; q100: number }
  | { ok: false; error: string };

export function parseQtyInput(input: number | string): QtyResult {
  const raw =
    typeof input === "string"
      ? input.trim().replace(",", ".")
      : String(input ?? "").trim();

  if (!raw) {
    return { ok: false, error: "Quantidade invalida." };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, error: "Quantidade invalida." };
  }

  const q100 = Math.round(parsed * 100);
  const normalized = q100 / 100;
  if (Math.abs(parsed - normalized) > 1e-6) {
    return {
      ok: false,
      error: "Quantidade invalida. Use no maximo duas casas decimais.",
    };
  }

  return { ok: true, normalized, q100 };
}

export function validateQtyByUnit(
  unitType: QtyUnitType,
  input: number | string
): QtyResult {
  const parsed = parseQtyInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const { normalized, q100 } = parsed;

  if (unitType === "UNIDADE") {
    if (!Number.isInteger(normalized)) {
      return {
        ok: false,
        error: "Para UNIDADE, a quantidade deve ser inteira.",
      };
    }
    return { ok: true, normalized: Math.round(normalized), q100 };
  }

  if (q100 % 5 !== 0) {
    return {
      ok: false,
      error: "Para KG, use multiplos de 0,05.",
    };
  }

  return { ok: true, normalized, q100 };
}
