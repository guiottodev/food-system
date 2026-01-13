import { describe, expect, it } from "vitest";
import {
  validateCancelReason,
  validateStatusTransition,
} from "../lib/domain/order";

describe("order domain rules", () => {
  it("requires cancel reason", () => {
    expect(validateCancelReason("").ok).toBe(false);
    expect(validateCancelReason("   ").ok).toBe(false);
    expect(validateCancelReason("cliente pediu").ok).toBe(true);
  });

  it("blocks invalid transitions and final status changes", () => {
    expect(validateStatusTransition("NOVO", "PRONTO").ok).toBe(false);
    expect(validateStatusTransition("ENTREGUE", "CANCELADO").ok).toBe(false);
  });
});
