import { describe, expect, it } from "vitest";
import {
  summarizeRecentChanges,
  shouldShowReconfirmBanner,
} from "../app/admin/orders/[id]/orderDetailChanges";

describe("order detail changes summary", () => {
  it("dedupes item changes by group", () => {
    const summary = summarizeRecentChanges([
      { action: "create_items", field: null },
      { action: "update_items", field: null },
      { action: "order_update", field: "items" },
    ]);

    expect(summary.labels).toEqual(["Itens alterados"]);
  });

  it("dedupes delivery date/time into one group", () => {
    const summary = summarizeRecentChanges([
      { action: "order_update", field: "deliveryDatetime" },
      { action: "order_update", field: "deliveryTime" },
    ]);

    expect(summary.labels).toEqual(["Data/hora alterada"]);
  });

  it("dedupes total changes into one group", () => {
    const summary = summarizeRecentChanges([
      { action: "order_update", field: "total" },
      { action: "order_update", field: "subtotal" },
      { action: "order_update", field: "deliveryFee" },
    ]);

    expect(summary.labels).toEqual(["Total alterado"]);
  });

  it("caps groups and reports overflow", () => {
    const summary = summarizeRecentChanges(
      [
        { action: "order_update", field: "items" },
        { action: "order_update", field: "deliveryDatetime" },
        { action: "order_update", field: "total" },
      ],
      { maxItems: 2 }
    );

    expect(summary.labels).toHaveLength(2);
    expect(summary.overflow).toBe(1);
  });

  it("does not show banner for final status", () => {
    const summary = summarizeRecentChanges([
      { action: "order_update", field: "items" },
    ]);

    expect(
      shouldShowReconfirmBanner({
        needsReconfirmation: true,
        status: "ENTREGUE",
        summary,
      })
    ).toBe(false);
  });
});
