import { describe, expect, it } from "vitest";
import { getOrderDetailViewModel } from "../app/admin/orders/[id]/orderDetailViewModel";
import type { AttentionReasonType, OrderAttentionSummary } from "../lib/domain/attention";
import type { OrderDetailViewModelInput } from "../app/admin/orders/[id]/orderDetailViewModel";

function buildAttention(overrides: Partial<OrderAttentionSummary> = {}): OrderAttentionSummary {
  return {
    reasons: [],
    strongReasons: [],
    weakReasons: [],
    hasAttention: false,
    missingFields: [],
    flags: {
      items: { state: "OK", label: "" },
      date: { state: "OK", label: "" },
      time: { state: "OPTIONAL", label: "" },
      address: { state: "OPTIONAL", label: "" },
      payment: { state: "OPTIONAL", label: "" },
    },
    ...overrides,
  };
}

function buildInput(overrides: Partial<OrderDetailViewModelInput> = {}): OrderDetailViewModelInput {
  return {
    status: "RASCUNHO",
    orderType: "ENCOMENDA",
    deliveryMethod: "RETIRADA",
    deliveryDatetime: new Date("2026-02-01T10:00:00Z"),
    deliveryTime: "10:00",
    needsReconfirmation: false,
    attention: buildAttention(),
    pendingSummary: {
      hasItems: true,
      hasDeliveryDate: true,
      incomplete: false,
      altered: false,
      strongPending: false,
    },
    itemsCount: 1,
    customerName: "Maria",
    addressReady: true,
    needsProduction: false,
    ...overrides,
  };
}

describe("order detail view model", () => {
  it("handles missing date without rendering time", () => {
    const viewModel = getOrderDetailViewModel(
      buildInput({
        deliveryDatetime: null,
        pendingSummary: {
          hasItems: true,
          hasDeliveryDate: false,
          incomplete: true,
          altered: false,
          strongPending: true,
        },
      })
    );

    expect(viewModel.schedule.header).toBe("Sem data");
    expect(viewModel.schedule.card).toBe("Sem data");
    expect(viewModel.schedule.timeLabel).toBeNull();
    expect(viewModel.checklist.find((item) => item.id === "time")).toBeUndefined();
  });

  it("shows sem horario when time is 00:00 and date exists", () => {
    const viewModel = getOrderDetailViewModel(
      buildInput({
        deliveryDatetime: new Date("2026-02-01T10:00:00Z"),
        deliveryTime: "00:00",
      })
    );

    expect(viewModel.schedule.header).toContain("Sem horario");
    expect(viewModel.schedule.card).toContain("Sem horario");
  });

  it("prioritizes incomplete before reconfirmation", () => {
    const viewModel = getOrderDetailViewModel(
      buildInput({
        needsReconfirmation: true,
        pendingSummary: {
          hasItems: false,
          hasDeliveryDate: false,
          incomplete: true,
          altered: true,
          strongPending: true,
        },
      })
    );

    expect(viewModel.primaryCta.actionId).toBe("complete");
    expect(viewModel.primaryCta.label).toBe("Completar pedido");
  });

  it("returns no CTA for final status", () => {
    const viewModel = getOrderDetailViewModel(
      buildInput({ status: "ENTREGUE" })
    );

    expect(viewModel.primaryCta.actionId).toBe("none");
    expect(viewModel.primaryCta.enabled).toBe(false);
  });

  it("limits chips and reports overflow", () => {
    const reasonTypes: AttentionReasonType[] = [
      "INCOMPLETE",
      "ALTERADO_APOS_CONFIRMACAO",
      "UNAVAILABLE_ITEMS",
      "MISSING_TIME",
      "MISSING_ADDRESS",
      "SALDO_INSUFICIENTE",
    ];
    const reasons = reasonTypes.map((type, index) => ({
      type,
      severity: index < 3 ? "strong" : "weak",
      label: `Motivo ${index + 1}`,
    }));

    const viewModel = getOrderDetailViewModel(
      buildInput({
        attention: buildAttention({
          reasons,
          strongReasons: reasons.slice(0, 3),
          weakReasons: reasons.slice(3),
          hasAttention: true,
        }),
      })
    );

    expect(viewModel.chips).toHaveLength(5);
    expect(viewModel.chipsOverflow).toBe(1);
  });
});
