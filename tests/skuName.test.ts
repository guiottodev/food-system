import { describe, expect, it } from "vitest";
import { generateSkuDisplayName } from "../app/admin/products/[id]/skuName";

describe("generateSkuDisplayName", () => {
  it("combines product name and attributes in order", () => {
    const result = generateSkuDisplayName(
      "Bolo de Chocolate",
      [
        { key: "tamanho", value: "grande" },
        { key: "sabor", value: "chocolate" },
      ],
      90
    );

    expect(result).toBe(
      "Bolo de Chocolate \u2022 tamanho: grande \u2022 sabor: chocolate"
    );
  });

  it("ignores empty attribute rows", () => {
    const result = generateSkuDisplayName(
      "Suco",
      [
        { key: "volume", value: "300ml" },
        { key: "", value: "" },
      ],
      90
    );

    expect(result).toBe("Suco \u2022 volume: 300ml");
  });

  it("truncates to max length with ellipsis", () => {
    const result = generateSkuDisplayName(
      "Produto",
      [{ key: "descricao", value: "muito grande mesmo" }],
      20
    );

    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith("\u2026")).toBe(true);
  });
});
