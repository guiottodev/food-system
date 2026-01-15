import { describe, expect, it } from "vitest";
import {
  normalizeKey,
  validateSkuAttributes,
} from "../lib/validation/skuAttributes";

describe("normalizeKey", () => {
  it("trims and lowercases", () => {
    expect(normalizeKey(" Tamanho ")).toBe("tamanho");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeKey("Cor do Produto")).toBe("cor-do-produto");
  });

  it("collapses repeated hyphens", () => {
    expect(normalizeKey("cor---do   produto")).toBe("cor-do-produto");
  });
});

describe("validateSkuAttributes", () => {
  it("rejects duplicated keys after normalization", () => {
    const result = validateSkuAttributes([
      { key: "Cor", value: "Azul" },
      { key: " cor ", value: "Verde" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("enforces max 15 attributes", () => {
    const attrs = Array.from({ length: 15 }, (_, index) => ({
      key: `key-${index + 1}`,
      value: `value-${index + 1}`,
    }));
    expect(validateSkuAttributes(attrs).ok).toBe(true);
    expect(
      validateSkuAttributes([
        ...attrs,
        { key: "extra", value: "value" },
      ]).ok
    ).toBe(false);
  });

  it("rejects missing key or value", () => {
    expect(
      validateSkuAttributes([{ key: "tamanho", value: "" }]).ok
    ).toBe(false);
    expect(
      validateSkuAttributes([{ key: "", value: "grande" }]).ok
    ).toBe(false);
  });

  it("keeps stable serialization order", () => {
    const input = [
      { key: "Cor", value: "Azul" },
      { key: "Tamanho", value: "G" },
    ];
    const first = validateSkuAttributes(input);
    const second = validateSkuAttributes(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(first.json).toBe(second.json);
      expect(first.json).toBe(
        JSON.stringify([
          { key: "cor", value: "Azul" },
          { key: "tamanho", value: "G" },
        ])
      );
    }
  });
});
