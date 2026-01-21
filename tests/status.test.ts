import { describe, expect, it } from "vitest";
import { canTransition, isFinalStatus } from "../lib/domain/status";

describe("status transitions", () => {
  it("allows sequential transitions", () => {
    expect(canTransition("RASCUNHO", "CONFIRMADO")).toBe(true);
    expect(canTransition("RASCUNHO", "EM_PRODUCAO")).toBe(true);
    expect(canTransition("CONFIRMADO", "EM_PRODUCAO")).toBe(true);
    expect(canTransition("EM_PRODUCAO", "PRONTO")).toBe(true);
    expect(canTransition("PRONTO", "ENTREGUE")).toBe(true);
  });

  it("blocks skipping steps", () => {
    expect(canTransition("RASCUNHO", "PRONTO")).toBe(false);
    expect(canTransition("EM_PRODUCAO", "ENTREGUE")).toBe(false);
  });

  it("marks final states", () => {
    expect(isFinalStatus("ENTREGUE")).toBe(true);
    expect(isFinalStatus("CANCELADO")).toBe(true);
    expect(isFinalStatus("RASCUNHO")).toBe(false);
  });
});
