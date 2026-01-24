import { describe, expect, it } from "vitest";
import { validateQuantity } from "../lib/validation/unitQuantity";

describe("validateQuantity", () => {
  it("accepts integers for UNIDADE", () => {
    const result = validateQuantity("UNIDADE", 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toBe(2);
    }
  });

  it("rejects decimals for UNIDADE", () => {
    expect(validateQuantity("UNIDADE", 1.5).ok).toBe(false);
  });

  it("accepts KG multiples of 0.05", () => {
    expect(validateQuantity("KG", 0.05).ok).toBe(true);
    expect(validateQuantity("KG", 0.1).ok).toBe(true);
    expect(validateQuantity("KG", 0.5).ok).toBe(true);
    expect(validateQuantity("KG", 1.25).ok).toBe(true);
  });

  it("rejects KG values outside the 0.05 step", () => {
    expect(validateQuantity("KG", 0.53).ok).toBe(false);
  });
});
