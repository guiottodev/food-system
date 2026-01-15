export type UnitType = "UNIDADE" | "CENTO" | "KG" | "KIT";

type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

export type QuantityResult =
  | { ok: true; normalized: number; scaled: number }
  | { ok: false; error: string };

const INVALID_ERROR = "Quantidade invalida.";

type Q100Result =
  | { ok: true; normalized: number; q100: number }
  | { ok: false; error: string };

export function parseQuantityToQ100(input: number | string): Q100Result {
  const raw =
    typeof input === "string"
      ? input.trim().replace(",", ".")
      : String(input ?? "").trim();

  if (!raw) {
    return { ok: false, error: INVALID_ERROR };
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) {
    return { ok: false, error: INVALID_ERROR };
  }

  const [intPart, decPart = ""] = raw.split(".");
  if (decPart.length > 2) {
    return {
      ok: false,
      error: "Quantidade invalida. Use no maximo duas casas decimais.",
    };
  }

  const paddedDec = decPart.padEnd(2, "0");
  const q100 =
    Number(intPart) * 100 + (paddedDec ? Number(paddedDec) : 0);

  if (!Number.isFinite(q100) || q100 <= 0) {
    return { ok: false, error: INVALID_ERROR };
  }

  return { ok: true, normalized: q100 / 100, q100 };
}

export function parseQuantityInput(input: number | string): ParseResult {
  const parsed = parseQuantityToQ100(input);
  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true, value: parsed.normalized };
}

export function validateQuantity(
  unitType: UnitType,
  input: number | string
): QuantityResult {
  const parsed = parseQuantityToQ100(input);
  if (!parsed.ok) {
    return parsed;
  }

  if (unitType === "KG") {
    if (parsed.q100 % 5 !== 0) {
      return { ok: false, error: "Para KG, use multiplos de 0,05." };
    }
    return {
      ok: true,
      normalized: parsed.normalized,
      scaled: parsed.q100 / 5,
    };
  }

  if (parsed.q100 % 100 !== 0) {
    return {
      ok: false,
      error: `Para ${unitType}, a quantidade deve ser inteira.`,
    };
  }

  const normalized = parsed.q100 / 100;
  return { ok: true, normalized, scaled: normalized };
}
