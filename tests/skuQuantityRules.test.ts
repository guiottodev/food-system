import { describe, expect, it } from "vitest";
import { validateSkuQuantity } from "../lib/quantity";
import { isSkuSellableInternal } from "../lib/catalog";

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

  it("enforces integer quantities for KIT with step=1", () => {
    expect(
      validateSkuQuantity({ unitType: "KIT", quantityStep: 1 }, 1.5).ok
    ).toBe(false);
    expect(
      validateSkuQuantity({ unitType: "KIT", quantityStep: 1 }, 2).ok
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
});

describe("isSkuSellableInternal", () => {
  it("allows internal sale for public-hidden product when active", () => {
    expect(
      isSkuSellableInternal({
        sku: { isActive: true },
        product: { isActive: true, isPublicHidden: true },
      })
    ).toBe(true);
  });

  it("rejects inactive sku or product", () => {
    expect(
      isSkuSellableInternal({
        sku: { isActive: false },
        product: { isActive: true },
      })
    ).toBe(false);
    expect(
      isSkuSellableInternal({
        sku: { isActive: true },
        product: { isActive: false },
      })
    ).toBe(false);
  });
});
