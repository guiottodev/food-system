export type UnitType = "UNIDADE" | "CENTO" | "KG";

type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export type QuantityResult =
  | { ok: true; normalized: number; scaled: number }
  | { ok: false; error: string };

const INVALID_ERROR = "Quantidade invalida.";

export function parseQuantityInput(input: number | string): ParseResult {
  const raw =
    typeof input === "string"
      ? input.trim().replace(",", ".")
      : String(input ?? "").trim();

  if (!raw) {
    return { ok: false, error: INVALID_ERROR };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { ok: false, error: INVALID_ERROR };
  }

  return { ok: true, value: parsed };
}

export function validateQuantity(
  unitType: UnitType,
  input: number | string
): QuantityResult {
  const parsed = parseQuantityInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const value = parsed.value;

  if (unitType === "KG") {
    const scaled = Math.round(value * 20);
    const normalized = scaled / 20;
    if (Math.abs(value * 20 - scaled) > 1e-6) {
      return { ok: false, error: "Para KG, use multiplos de 0,05." };
    }
    return { ok: true, normalized, scaled };
  }

  if (!Number.isInteger(value)) {
    return {
      ok: false,
      error: `Para ${unitType}, a quantidade deve ser inteira.`,
    };
  }

  return { ok: true, normalized: Math.round(value), scaled: Math.round(value) };
}
