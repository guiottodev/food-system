import { DeliveryMethod, OrderStatus, OrderType } from "@prisma/client";
import { DEFAULT_DELIVERY_TIME, OrderItemSnapshot, getOrderPendingSummary } from "./order";

export type AttentionSeverity = "strong" | "weak";
export type AttentionReasonType =
  | "INCOMPLETE"
  | "ALTERADO_APOS_CONFIRMACAO"
  | "UNAVAILABLE_ITEMS"
  | "MISSING_TIME"
  | "MISSING_ADDRESS"
  | "SALDO_INSUFICIENTE";

export type AttentionReason = {
  type: AttentionReasonType;
  severity: AttentionSeverity;
  label: string;
};

export type FieldFlagState = "OK" | "PENDING" | "OPTIONAL";

export type FieldFlag = {
  state: FieldFlagState;
  label: string;
};

export type OrderAttentionInput = {
  status: OrderStatus;
  orderType?: OrderType | null;
  deliveryDatetime?: Date | null;
  deliveryTime?: string | null;
  deliveryMethod?: DeliveryMethod | null;
  addressText?: string | null;
  addressCity?: string | null;
  items?: OrderItemSnapshot[] | null;
  needsReconfirmation?: boolean | null;
  paidAt?: Date | null;
  hasUnavailableItems?: boolean | null;
  hasStockShortage?: boolean | null;
};

export type OrderAttentionSummary = {
  reasons: AttentionReason[];
  strongReasons: AttentionReason[];
  weakReasons: AttentionReason[];
  hasAttention: boolean;
  missingFields: string[];
  flags: {
    items: FieldFlag;
    date: FieldFlag;
    time: FieldFlag;
    address: FieldFlag;
    payment: FieldFlag;
  };
};

const FINAL_STATUSES: OrderStatus[] = ["ENTREGUE", "CANCELADO"];

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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWithinNextDays(target: Date, days: number, now = new Date()) {
  const start = startOfDay(now).getTime();
  const limit = startOfDay(new Date(now.getTime() + days * 86400000)).getTime();
  const candidate = startOfDay(target).getTime();
  return candidate >= start && candidate <= limit;
}

function hasDeliveryAddress(order: OrderAttentionInput) {
  if (order.deliveryMethod !== "ENTREGA") {
    return true;
  }
  return Boolean(normalizeText(order.addressText)) && Boolean(normalizeText(order.addressCity));
}

function buildFlag(state: FieldFlagState, label: string): FieldFlag {
  return { state, label };
}

export function getOrderAttentionSummary(
  order: OrderAttentionInput
): OrderAttentionSummary {
  if (FINAL_STATUSES.includes(order.status) && !order.hasStockShortage) {
    return {
      reasons: [],
      strongReasons: [],
      weakReasons: [],
      hasAttention: false,
      missingFields: [],
      flags: {
        items: buildFlag("OPTIONAL", "Sem pendencia"),
        date: buildFlag("OPTIONAL", "Sem pendencia"),
        time: buildFlag("OPTIONAL", "Sem pendencia"),
        address: buildFlag("OPTIONAL", "Sem pendencia"),
        payment: buildFlag("OPTIONAL", "Sem pendencia"),
      },
    };
  }
  if (FINAL_STATUSES.includes(order.status) && order.hasStockShortage) {
    const reasons: AttentionReason[] = [
      {
        type: "SALDO_INSUFICIENTE",
        severity: "weak",
        label: "Saldo insuficiente (producao pendente)",
      },
    ];
    return {
      reasons,
      strongReasons: [],
      weakReasons: reasons,
      hasAttention: true,
      missingFields: [],
      flags: {
        items: buildFlag("OPTIONAL", "Sem pendencia"),
        date: buildFlag("OPTIONAL", "Sem pendencia"),
        time: buildFlag("OPTIONAL", "Sem pendencia"),
        address: buildFlag("OPTIONAL", "Sem pendencia"),
        payment: buildFlag("OPTIONAL", "Sem pendencia"),
      },
    };
  }

  const pending = getOrderPendingSummary({
    deliveryDatetime: order.deliveryDatetime,
    items: order.items ?? [],
    needsReconfirmation: order.needsReconfirmation,
  });

  const reasons: AttentionReason[] = [];
  const missingFields: string[] = [];

  if (pending.incomplete) {
    reasons.push({
      type: "INCOMPLETE",
      severity: "strong",
      label: "Pedido incompleto",
    });
    if (!pending.hasItems) missingFields.push("items");
    if (!pending.hasDeliveryDate) missingFields.push("date");
  }

  if (pending.altered) {
    reasons.push({
      type: "ALTERADO_APOS_CONFIRMACAO",
      severity: "strong",
      label: "Alterado apos confirmacao",
    });
  }

  if (order.hasUnavailableItems) {
    const orderType = order.orderType ?? "ENCOMENDA";
    const unavailableLabel =
      orderType === "PRONTA_ENTREGA"
        ? "Sem saldo (pronta entrega)"
        : "Precisa produzir";
    reasons.push({
      type: "UNAVAILABLE_ITEMS",
      severity: "weak",
      label: unavailableLabel,
    });
  }

  if (order.hasStockShortage) {
    reasons.push({
      type: "SALDO_INSUFICIENTE",
      severity: "weak",
      label: "Saldo insuficiente (producao pendente)",
    });
  }

  const addressMissing = !hasDeliveryAddress(order);
  if (addressMissing) {
    reasons.push({
      type: "MISSING_ADDRESS",
      severity: "weak",
      label: "Endereco nao informado",
    });
    missingFields.push("address");
  }

  const timeMissing =
    Boolean(order.deliveryDatetime) &&
    !normalizeDeliveryTime(order.deliveryTime) &&
    isWithinNextDays(order.deliveryDatetime as Date, 7);
  if (timeMissing) {
    reasons.push({
      type: "MISSING_TIME",
      severity: "weak",
      label: "Horario a confirmar",
    });
    missingFields.push("time");
  }

  const itemsFlag = pending.hasItems
    ? buildFlag("OK", "Itens ok")
    : buildFlag("PENDING", "Adicione itens");
  const dateFlag = pending.hasDeliveryDate
    ? buildFlag("OK", "Data definida")
    : buildFlag("PENDING", "Informe a data");

  let timeFlag: FieldFlag = buildFlag("OPTIONAL", "Horario a confirmar");
  if (order.deliveryDatetime) {
    if (normalizeDeliveryTime(order.deliveryTime)) {
      timeFlag = buildFlag("OK", "Horario definido");
    } else if (isWithinNextDays(order.deliveryDatetime, 7)) {
      timeFlag = buildFlag("PENDING", "Horario a confirmar");
    } else {
      timeFlag = buildFlag("OPTIONAL", "Horario a confirmar");
    }
  }

  let addressFlag: FieldFlag = buildFlag("OPTIONAL", "Sem endereco");
  if (order.deliveryMethod === "ENTREGA") {
    addressFlag = addressMissing
      ? buildFlag("PENDING", "Endereco pendente")
      : buildFlag("OK", "Endereco informado");
  }

  let paymentFlag: FieldFlag = buildFlag("OPTIONAL", "Pagamento nao exigido");
  if (order.paidAt) {
    paymentFlag = buildFlag("OK", "Pagamento recebido");
  }

  const strongReasons = reasons.filter((reason) => reason.severity === "strong");
  const weakReasons = reasons.filter((reason) => reason.severity === "weak");

  return {
    reasons,
    strongReasons,
    weakReasons,
    hasAttention: reasons.length > 0,
    missingFields,
    flags: {
      items: itemsFlag,
      date: dateFlag,
      time: timeFlag,
      address: addressFlag,
      payment: paymentFlag,
    },
  };
}

export function hasStrongAttention(summary: OrderAttentionSummary) {
  return summary.strongReasons.length > 0;
}
