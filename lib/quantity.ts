export type QtyUnitType = "KG" | "UNIDADE";

export function validateQtyByUnit(unitType: QtyUnitType, qty: number): string | null {
  if (!Number.isFinite(qty) || qty <= 0) {
    return "Quantidade invalida.";
  }

  if (unitType === "UNIDADE") {
    if (!Number.isInteger(qty)) {
      return "Para UNIDADE, a quantidade deve ser inteira.";
    }
    return null;
  }

  const q100 = Math.round(qty * 100);
  const normalized = q100 / 100;
  if (Math.abs(qty - normalized) > 1e-9) {
    return "Para KG, use no maximo duas casas decimais.";
  }
  if (q100 % 5 !== 0) {
    return "Para KG, use multiplos de 0,05.";
  }

  return null;
}

export function isQtyValid(unitType: QtyUnitType, qty: number): boolean {
  return validateQtyByUnit(unitType, qty) === null;
}
