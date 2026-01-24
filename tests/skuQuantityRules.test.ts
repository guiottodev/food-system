import { describe, expect, it } from "vitest";
import { validateSkuQuantity } from "../lib/quantity";
import { getSkuDefaults, normalizeUnitLabel, normalizeUnitType } from "../lib/unit";
import { isSkuAvailableInternal } from "../lib/skuAvailability";

describe("validateSkuQuantity", () => {
  it("enforces integer quantities for UNIDADE with step=1", () => {
    expect(
      validateSkuQuantity(
        { unitType: "UNIDADE", quantityStep: 1 },
        1.5
      ).ok
    ).toBe(false);
    expect(
      validateSkuQuantity({ unitType: "UNIDADE", quantityStep: 1 }, 2).ok
    ).toBe(true);
  });

  it("enforces step for KG", () => {
    expect(
      validateSkuQuantity({ unitType: "KG", quantityStep: 0.1 }, 0.15).ok
    ).toBe(false);
    expect(
      validateSkuQuantity({ unitType: "KG", quantityStep: 0.1 }, 0.1).ok
    ).toBe(true);
  });

  it("enforces global 0.05 rule for KG", () => {
    expect(validateSkuQuantity({ unitType: "KG" }, 0.07).ok).toBe(false);
    expect(validateSkuQuantity({ unitType: "KG" }, 0.1).ok).toBe(true);
  });

  it("combines KG 0.05 rule with step", () => {
    expect(
      validateSkuQuantity({ unitType: "KG", quantityStep: 0.1 }, 0.05).ok
    ).toBe(false);
    expect(
      validateSkuQuantity({ unitType: "KG", quantityStep: 0.1 }, 0.1).ok
    ).toBe(true);
    expect(
      validateSkuQuantity({ unitType: "KG", quantityStep: 0.1 }, 0.2).ok
    ).toBe(true);
  });

  it("enforces minQty", () => {
    expect(
      validateSkuQuantity(
        { unitType: "UNIDADE", minQty: 3, quantityStep: 1 },
        2
      ).ok
    ).toBe(false);
    expect(
      validateSkuQuantity(
        { unitType: "UNIDADE", minQty: 3, quantityStep: 1 },
        3
      ).ok
    ).toBe(true);
  });

  it("enforces KG minQty 0.5", () => {
    expect(
      validateSkuQuantity(
        { unitType: "KG", minQty: 0.5, quantityStep: 0.05 },
        0.45
      ).ok
    ).toBe(false);
    expect(
      validateSkuQuantity(
        { unitType: "KG", minQty: 0.5, quantityStep: 0.05 },
        0.5
      ).ok
    ).toBe(true);
  });
});

describe("getSkuDefaults", () => {
  it("returns defaults for unit types", () => {
    expect(getSkuDefaults("UNIDADE")).toEqual({
      minQty: 1,
      quantityStep: 1,
      unitLabel: "un",
    });
    expect(getSkuDefaults("KG")).toEqual({
      minQty: 0.5,
      quantityStep: 0.05,
      unitLabel: "kg",
    });
  });

  it("rejects KIT in normalization/labels", () => {
    expect(() => normalizeUnitType("kit")).toThrow();
    expect(() => normalizeUnitLabel("kit")).toThrow();
  });
});

describe("isSkuAvailableInternal", () => {
  it("allows when sku and product are active", () => {
    expect(
      isSkuAvailableInternal({
        sku: { isActive: true },
        product: { isActive: true },
      })
    ).toBe(true);
  });

  it("rejects inactive sku or product", () => {
    expect(
      isSkuAvailableInternal({
        sku: { isActive: false },
        product: { isActive: true },
      })
    ).toBe(false);
    expect(
      isSkuAvailableInternal({
        sku: { isActive: true },
        product: { isActive: false },
      })
    ).toBe(false);
  });
});
