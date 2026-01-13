import { OrderStatus } from "@prisma/client";
import { canTransition, isFinalStatus } from "./status";

type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateCancelReason(reason: string): ValidationResult {
  if (!reason || !reason.trim()) {
    return { ok: false, error: "Motivo obrigatorio." };
  }
  return { ok: true };
}

export function validateStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): ValidationResult {
  if (isFinalStatus(from)) {
    return { ok: false, error: "Status final nao pode ser alterado." };
  }
  if (!canTransition(from, to)) {
    return { ok: false, error: "Transicao de status invalida." };
  }
  return { ok: true };
}
