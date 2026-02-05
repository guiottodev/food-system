import { OrderStatus } from "@prisma/client";
import { canTransition, isFinalStatus } from "./status";

type StatusTransitionError = "final_status" | "invalid_transition";
type OrderTransitionError =
  | StatusTransitionError
  | "not_ready"
  | "strong_pending";

type ValidationResult<TError extends string = string> =
  | { ok: true }
  | { ok: false; error: TError };

type NumericValue = number | string | { toString: () => string } | null | undefined;

export type OrderItemSnapshot = {
  skuId?: string | null;
  quantity?: NumericValue;
};

export type OrderReadinessInput = {
  deliveryDatetime?: Date | null;
  items?: OrderItemSnapshot[];
};

export type OrderPendingInput = OrderReadinessInput & {
  needsReconfirmation?: boolean | null;
};

export type OrderTransitionInput = OrderPendingInput & {
  status: OrderStatus;
  paidAt?: Date | null;
};

export type OrderCriticalSnapshot = {
  deliveryDatetime?: Date | null;
  deliveryTime?: string | null;
  addressText?: string | null;
  addressBairro?: string | null;
  addressReferencia?: string | null;
  addressCity?: string | null;
  addressCep?: string | null;
  notes?: string | null;
  deliveryFee?: NumericValue;
  subtotal?: NumericValue;
  total?: NumericValue;
  items?: OrderItemSnapshot[];
};

export const DEFAULT_DELIVERY_TIME = "00:00";

/**
 * Formata horário de entrega para exibição. Retorna "Sem horario" quando
 * o valor está vazio ou é DEFAULT_DELIVERY_TIME ("00:00").
 */
export function formatDeliveryTime(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === DEFAULT_DELIVERY_TIME) {
    return "Sem horario";
  }
  return trimmed;
}

export function validateCancelReason(reason: string): ValidationResult {
  if (!reason || !reason.trim()) {
    return { ok: false, error: "Motivo obrigatorio." };
  }
  return { ok: true };
}

export function validateStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): ValidationResult<StatusTransitionError> {
  if (isFinalStatus(from)) {
    return { ok: false, error: "final_status" };
  }
  if (!canTransition(from, to)) {
    return { ok: false, error: "invalid_transition" };
  }
  return { ok: true };
}

export function getOrderReadiness(order: OrderReadinessInput) {
  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const hasDeliveryDate = Boolean(order.deliveryDatetime);
  const ready = hasItems && hasDeliveryDate;
  return { ready, hasItems, hasDeliveryDate };
}

export function getOrderPendingSummary(order: OrderPendingInput) {
  const readiness = getOrderReadiness(order);
  const incomplete = !readiness.ready;
  const altered = Boolean(order.needsReconfirmation);
  const strongPending = incomplete || altered;
  return {
    ...readiness,
    incomplete,
    altered,
    strongPending,
  };
}

export function validateOrderTransition(
  order: OrderTransitionInput,
  nextStatus: OrderStatus
): ValidationResult<OrderTransitionError> {
  const statusValidation = validateStatusTransition(order.status, nextStatus);
  if (!statusValidation.ok) {
    return statusValidation;
  }

  const pending = getOrderPendingSummary(order);

  if (nextStatus === "EM_PRODUCAO" && !pending.ready) {
    return { ok: false, error: "not_ready" };
  }

  if (nextStatus === "CONFIRMADO" && !pending.ready) {
    return { ok: false, error: "not_ready" };
  }

  if ((nextStatus === "PRONTO" || nextStatus === "ENTREGUE") && pending.strongPending) {
    return { ok: false, error: "strong_pending" };
  }

  return { ok: true };
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function normalizeDeliveryTime(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized === DEFAULT_DELIVERY_TIME) return null;
  return normalized;
}

function normalizeNumber(value: NumericValue) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numbersEqual(a: number | null, b: number | null) {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < 0.000001;
}

function normalizeItems(items: OrderItemSnapshot[] | undefined) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      skuId: item.skuId ?? null,
      quantity: normalizeNumber(item.quantity) ?? 0,
    }))
    .sort((a, b) => {
      const skuCompare = String(a.skuId ?? "").localeCompare(String(b.skuId ?? ""));
      if (skuCompare !== 0) return skuCompare;
      return a.quantity - b.quantity;
    });
}

export function hasCriticalChanges(
  before: OrderCriticalSnapshot,
  after: OrderCriticalSnapshot
) {
  const beforeDate = before.deliveryDatetime?.getTime() ?? null;
  const afterDate = after.deliveryDatetime?.getTime() ?? null;
  if (beforeDate !== afterDate) return true;

  if (
    normalizeDeliveryTime(before.deliveryTime) !==
    normalizeDeliveryTime(after.deliveryTime)
  ) {
    return true;
  }

  const textFields: Array<keyof OrderCriticalSnapshot> = [
    "addressText",
    "addressBairro",
    "addressReferencia",
    "addressCity",
    "addressCep",
    "notes",
  ];
  for (const field of textFields) {
    if (normalizeText(before[field] as string | null) !== normalizeText(after[field] as string | null)) {
      return true;
    }
  }

  const numberFields: Array<keyof OrderCriticalSnapshot> = [
    "deliveryFee",
    "subtotal",
    "total",
  ];
  for (const field of numberFields) {
    if (!numbersEqual(normalizeNumber(before[field] as NumericValue), normalizeNumber(after[field] as NumericValue))) {
      return true;
    }
  }

  const beforeItems = normalizeItems(before.items);
  const afterItems = normalizeItems(after.items);
  if (beforeItems.length !== afterItems.length) return true;
  for (let i = 0; i < beforeItems.length; i += 1) {
    if (beforeItems[i].skuId !== afterItems[i].skuId) return true;
    if (!numbersEqual(beforeItems[i].quantity, afterItems[i].quantity)) return true;
  }

  return false;
}

export function shouldRequireReconfirmation(
  order: { confirmedAt?: Date | null },
  before: OrderCriticalSnapshot,
  after: OrderCriticalSnapshot
) {
  if (!order.confirmedAt) {
    return false;
  }
  return hasCriticalChanges(before, after);
}

export function shouldFlagReconfirmation(
  status: OrderStatus,
  before: OrderCriticalSnapshot,
  after: OrderCriticalSnapshot
) {
  if (status === "RASCUNHO") {
    return false;
  }
  return hasCriticalChanges(before, after);
}
