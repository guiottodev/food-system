import {
  parseQuantityInput,
  validateQuantity,
  type QuantityResult,
  type UnitType,
} from "./validation/unitQuantity";

export type QtyUnitType = UnitType;

type QtyResult =
  | { ok: true; normalized: number; q100: number }
  | { ok: false; error: string };

export function parseQtyInput(input: number | string): QtyResult {
  const parsed = parseQuantityInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const q100 = Math.round(parsed.value * 100);
  const normalized = q100 / 100;
  if (Math.abs(parsed.value - normalized) > 1e-6) {
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
  const result: QuantityResult = validateQuantity(unitType, input);
  if (!result.ok) {
    return result;
  }

  const q100 = Math.round(result.normalized * 100);
  return { ok: true, normalized: result.normalized, q100 };
}
