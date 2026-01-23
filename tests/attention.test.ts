import { describe, expect, it } from "vitest";
import { getOrderAttentionSummary, hasStrongAttention } from "../lib/domain/attention";

const baseOrder = {
  status: "RASCUNHO",
  orderType: "ENCOMENDA",
  deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
  deliveryTime: "10:00",
  deliveryMethod: "RETIRADA",
  addressText: null,
  addressCity: null,
  items: [{ id: "item-1" }],
  needsReconfirmation: false,
  paidAt: null,
};

describe("attention inbox", () => {
  it("flags incomplete orders as strong pending", () => {
    const summary = getOrderAttentionSummary({
      ...baseOrder,
      items: [],
    });
    expect(
      summary.strongReasons.some((reason) => reason.type === "INCOMPLETE")
    ).toBe(true);
    expect(hasStrongAttention(summary)).toBe(true);
  });

  it("flags altered orders as strong pending", () => {
    const summary = getOrderAttentionSummary({
      ...baseOrder,
      needsReconfirmation: true,
    });
    expect(
      summary.strongReasons.some(
        (reason) => reason.type === "ALTERADO_APOS_CONFIRMACAO"
      )
    ).toBe(true);
  });

  it("filters inbox to only strong pending orders", () => {
    const orders = [
      baseOrder,
      { ...baseOrder, items: [] },
      { ...baseOrder, needsReconfirmation: true },
    ];
    const strongCount = orders.filter((order) =>
      hasStrongAttention(getOrderAttentionSummary(order))
    ).length;
    expect(strongCount).toBe(2);
  });

  it("labels unavailable items based on order type", () => {
    const encomenda = getOrderAttentionSummary({
      ...baseOrder,
      hasUnavailableItems: true,
    });
    expect(
      encomenda.weakReasons.some((reason) => reason.label === "Precisa produzir")
    ).toBe(true);

    const prontaEntrega = getOrderAttentionSummary({
      ...baseOrder,
      orderType: "PRONTA_ENTREGA",
      hasUnavailableItems: true,
    });
    expect(
      prontaEntrega.weakReasons.some(
        (reason) => reason.label === "Sem saldo (pronta entrega)"
      )
    ).toBe(true);
  });
});
