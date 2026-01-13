function parseQtyInput(input) {
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

function validateQtyByUnit(unitType, input) {
  const parsed = parseQtyInput(input);
  if (!parsed.ok) return parsed;

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
    return { ok: false, error: "Para KG, use multiplos de 0,05." };
  }

  return { ok: true, normalized, q100 };
}

const cases = [
  { unit: "KG", input: 0.5, ok: true },
  { unit: "KG", input: 0.55, ok: true },
  { unit: "KG", input: 0.53, ok: false },
  { unit: "UNIDADE", input: 1, ok: true },
  { unit: "UNIDADE", input: 1.0, ok: true, normalized: 1 },
  { unit: "UNIDADE", input: 1.5, ok: false },
  { unit: "KG", input: "0,55", ok: true },
  { unit: "UNIDADE", input: " 2 ", ok: true, normalized: 2 },
];

let failed = 0;

for (const test of cases) {
  const result = validateQtyByUnit(test.unit, test.input);
  if (result.ok !== test.ok) {
    console.error(
      `FAIL ${test.unit} ${test.input}: esperado ok=${test.ok}, obtido ok=${result.ok}`
    );
    failed += 1;
    continue;
  }
  if (test.ok && test.normalized !== undefined) {
    if (result.normalized !== test.normalized) {
      console.error(
        `FAIL ${test.unit} ${test.input}: esperado normalized=${test.normalized}, obtido ${result.normalized}`
      );
      failed += 1;
    }
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log("Quantidade OK: todos os testes passaram.");
