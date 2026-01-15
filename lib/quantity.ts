import {
  parseQuantityInput,
  parseQuantityToQ100,
  validateQuantity,
  type QuantityResult,
  type UnitType,
} from "./validation/unitQuantity";

export type QtyUnitType = UnitType;

type QtyResult =
  | { ok: true; normalized: number; q100: number }
  | { ok: false; error: string };

type DecimalLike = number | string | { toString: () => string };

type SkuQuantityRules = {
  unitType: QtyUnitType;
  minQty?: DecimalLike | null;
  quantityStep?: DecimalLike | null;
};

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

function toQ100(
  value: DecimalLike | null | undefined
): number | null | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = typeof value === "number" || typeof value === "string"
    ? value
    : value.toString();
  const parsed = parseQuantityToQ100(raw);
  if (!parsed.ok) return null;
  return parsed.q100;
}

export function validateSkuQuantity(
  rules: SkuQuantityRules,
  input: number | string
): QtyResult {
  const parsed = parseQuantityToQ100(input);
  if (!parsed.ok) {
    return parsed;
  }

  if (rules.unitType === "KG") {
    if (parsed.q100 % 5 !== 0) {
      return { ok: false, error: "Para KG, use multiplos de 0,05." };
    }
  } else if (parsed.q100 % 100 !== 0) {
    return {
      ok: false,
      error: `Para ${rules.unitType}, a quantidade deve ser inteira.`,
    };
  }

  const stepQ100 = toQ100(rules.quantityStep);
  if (stepQ100 === null) {
    return { ok: false, error: "Quantidade invalida." };
  }
  if (stepQ100 !== undefined) {
    if (stepQ100 <= 0 || parsed.q100 % stepQ100 !== 0) {
      return { ok: false, error: "Quantidade invalida." };
    }
  }

  const minQ100 = toQ100(rules.minQty);
  if (minQ100 === null) {
    return { ok: false, error: "Quantidade invalida." };
  }
  if (minQ100 !== undefined && parsed.q100 < minQ100) {
    return { ok: false, error: "Quantidade invalida." };
  }

  return { ok: true, normalized: parsed.normalized, q100: parsed.q100 };
}
