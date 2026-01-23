import { describe, expect, it } from "vitest";
import { validateSkuFormValues } from "../lib/skuFormValidation";

describe("sku form validation", () => {
  it("rejects empty name", () => {
    const result = validateSkuFormValues({
      displayName: " ",
      unitType: "UNIDADE",
      price: "10",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.displayName).toBeTruthy();
  });

  it("rejects invalid price", () => {
    const result = validateSkuFormValues({
      displayName: "Produto",
      unitType: "UNIDADE",
      price: "-1",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.price).toBeTruthy();
  });

  it("accepts valid name, type and price", () => {
    const result = validateSkuFormValues({
      displayName: "Produto",
      unitType: "KG",
      price: "10,50",
    });
    expect(result.ok).toBe(true);
  });
});
