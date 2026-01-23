import { describe, expect, it } from "vitest";
import {
  getOrderPendingSummary,
  shouldFlagReconfirmation,
  shouldRequireReconfirmation,
  validateOrderTransition,
} from "../lib/domain/order";

function buildOrder(overrides: Partial<Parameters<typeof validateOrderTransition>[0]> = {}) {
  return {
    status: "RASCUNHO",
    deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
    items: [{ skuId: "sku-1", quantity: 1 }],
    needsReconfirmation: false,
    paidAt: null,
    ...overrides,
  };
}

describe("order core domain", () => {
  it("marks incomplete without items or date and blocks pronto/entregue", () => {
    const noItems = buildOrder({ items: [] });
    const pendingNoItems = getOrderPendingSummary(noItems);
    expect(pendingNoItems.incomplete).toBe(true);

    const blockProducao = validateOrderTransition(noItems, "EM_PRODUCAO");
    expect(blockProducao.ok).toBe(false);
    if (!blockProducao.ok) {
      expect(blockProducao.error).toBe("not_ready");
    }

    const blockPronto = validateOrderTransition(
      { ...noItems, status: "EM_PRODUCAO" },
      "PRONTO"
    );
    expect(blockPronto.ok).toBe(false);
    if (!blockPronto.ok) {
      expect(blockPronto.error).toBe("strong_pending");
    }

    const noDate = buildOrder({ deliveryDatetime: null });
    const pendingNoDate = getOrderPendingSummary(noDate);
    expect(pendingNoDate.incomplete).toBe(true);

    const blockEntregue = validateOrderTransition(
      { ...noDate, status: "PRONTO" },
      "ENTREGUE"
    );
    expect(blockEntregue.ok).toBe(false);
    if (!blockEntregue.ok) {
      expect(blockEntregue.error).toBe("strong_pending");
    }
  });

  it("blocks confirming an incomplete order", () => {
    const incomplete = buildOrder({ items: [], deliveryDatetime: null });
    const confirm = validateOrderTransition(incomplete, "CONFIRMADO");
    expect(confirm.ok).toBe(false);
    if (!confirm.ok) {
      expect(confirm.error).toBe("not_ready");
    }
  });

  it("flags critical changes after confirmation and blocks pronto/entregue", () => {
    const confirmedAt = new Date("2026-01-19T10:00:00Z");
    const before = {
      deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
      items: [{ skuId: "sku-1", quantity: 1 }],
      total: 10,
      subtotal: 10,
      deliveryFee: 0,
      notes: "sem cebola",
    };
    const after = {
      ...before,
      items: [{ skuId: "sku-1", quantity: 2 }],
    };

    expect(
      shouldRequireReconfirmation({ confirmedAt }, before, after)
    ).toBe(true);

    const blocked = validateOrderTransition(
      {
        status: "EM_PRODUCAO",
        deliveryDatetime: before.deliveryDatetime,
        items: before.items,
        needsReconfirmation: true,
        paidAt: new Date(),
      },
      "PRONTO"
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error).toBe("strong_pending");
    }
  });

  it("flags reconfirmation on critical edit when status is confirmed or above", () => {
    const before = {
      deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
      items: [{ skuId: "sku-1", quantity: 1 }],
      total: 10,
      subtotal: 10,
      deliveryFee: 0,
      notes: "sem cebola",
    };
    const after = {
      ...before,
      items: [{ skuId: "sku-1", quantity: 2 }],
    };

    expect(shouldFlagReconfirmation("CONFIRMADO", before, after)).toBe(true);
    expect(shouldFlagReconfirmation("RASCUNHO", before, after)).toBe(false);
  });

  it("allows reconfirmation to remove the block", () => {
    const ready = buildOrder({
      status: "EM_PRODUCAO",
      needsReconfirmation: false,
    });

    const result = validateOrderTransition(ready, "PRONTO");
    expect(result.ok).toBe(true);
  });

  it("allows moving to producao without confirmation when ready", () => {
    const order = buildOrder({ status: "RASCUNHO" });
    const result = validateOrderTransition(order, "EM_PRODUCAO");
    expect(result.ok).toBe(true);
  });

  it("requires payment only for entregue", () => {
    const ready = buildOrder({ status: "EM_PRODUCAO", paidAt: null });
    const pronto = validateOrderTransition(ready, "PRONTO");
    expect(pronto.ok).toBe(true);

    const entregueBlocked = validateOrderTransition(
      { ...ready, status: "PRONTO" },
      "ENTREGUE"
    );
    expect(entregueBlocked.ok).toBe(false);
    if (!entregueBlocked.ok) {
      expect(entregueBlocked.error).toBe("payment_required");
    }

    const entregueOk = validateOrderTransition(
      { ...ready, status: "PRONTO" },
      "ENTREGUE",
      { willMarkPaid: true }
    );
    expect(entregueOk.ok).toBe(true);
  });
});
