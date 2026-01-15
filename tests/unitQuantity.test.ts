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

  it("accepts integers for CENTO", () => {
    const result = validateQuantity("CENTO", "3");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toBe(3);
    }
  });

  it("accepts integers for KIT", () => {
    const result = validateQuantity("KIT", 4);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalized).toBe(4);
    }
  });

  it("rejects decimals for UNIDADE/CENTO", () => {
    expect(validateQuantity("UNIDADE", 1.5).ok).toBe(false);
    expect(validateQuantity("CENTO", 2.2).ok).toBe(false);
    expect(validateQuantity("KIT", 2.5).ok).toBe(false);
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
