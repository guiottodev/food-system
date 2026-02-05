import { formatDeliveryTime } from "@/lib/domain/order";
import type { OrderAttentionSummary } from "@/lib/domain/attention";
import type { OrderStatus } from "@prisma/client";

export type ChecklistStatus = "OK" | "WARN" | "BLOCK";

export type OrderDetailChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  anchorTarget?: string;
};

export type OrderDetailChip = {
  label: string;
  severity: "strong" | "weak";
};

export type OrderDetailBlockedReason = {
  label: string;
  anchorTarget?: string;
  context?: "page" | "edit";
};

export type OrderDetailPrimaryCta = {
  label: string;
  actionId:
    | "none"
    | "complete"
    | "review_changes"
    | "confirm"
    | "advance_status";
  enabled: boolean;
  blockedReasons: OrderDetailBlockedReason[];
  statusTarget?: OrderStatus;
  helpText?: string;
  anchorTarget?: string;
};

export type OrderDetailScheduleDisplay = {
  header: string;
  card: string;
  timeLabel: string | null;
  hasDate: boolean;
};

export type OrderDetailViewModel = {
  primaryCta: OrderDetailPrimaryCta;
  checklist: OrderDetailChecklistItem[];
  chips: OrderDetailChip[];
  chipsOverflow: number;
  schedule: OrderDetailScheduleDisplay;
};

export type OrderDetailViewModelInput = {
  status: OrderStatus;
  orderType: "ENCOMENDA" | "PRONTA_ENTREGA";
  deliveryMethod: "ENTREGA" | "RETIRADA";
  deliveryDatetime: Date | null;
  deliveryTime: string | null;
  needsReconfirmation: boolean;
  attention: OrderAttentionSummary;
  pendingSummary: {
    hasItems: boolean;
    hasDeliveryDate: boolean;
    incomplete: boolean;
    altered: boolean;
    strongPending: boolean;
  };
  itemsCount: number;
  customerName: string;
  addressReady: boolean;
  needsProduction: boolean;
};

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

function formatScheduleDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

function buildSchedule(
  value?: Date | null,
  time?: string | null
): OrderDetailScheduleDisplay {
  if (!value) {
    return {
      header: "Sem data",
      card: "Sem data",
      timeLabel: null,
      hasDate: false,
    };
  }

  const dateHeader = formatScheduleDate(value);
  const dateCard = formatDate(value);
  const timeLabel = formatDeliveryTime(time);
  return {
    header: `${dateHeader} \u2022 ${timeLabel}`,
    card: `${dateCard} \u2022 ${timeLabel}`,
    timeLabel,
    hasDate: true,
  };
}

function buildChecklist(input: OrderDetailViewModelInput) {
  const itemsLabel =
    input.itemsCount > 0
      ? `${input.itemsCount} ${input.itemsCount === 1 ? "item" : "itens"}`
      : "Nenhum item";
  const hasDate = Boolean(input.deliveryDatetime);
  const dateLabel =
    input.orderType === "PRONTA_ENTREGA"
      ? "Agora"
      : hasDate
      ? formatDate(input.deliveryDatetime)
      : "Sem data";
  const timeLabel =
    input.orderType === "PRONTA_ENTREGA"
      ? "Agora"
      : hasDate
      ? formatDeliveryTime(input.deliveryTime)
      : null;

  const checklist: OrderDetailChecklistItem[] = [
    {
      id: "customer",
      label: `Cliente: ${input.customerName}`,
      status: "OK",
      anchorTarget: "#order-customer",
    },
    {
      id: "items",
      label: `Itens: ${itemsLabel}`,
      status: input.pendingSummary.hasItems ? "OK" : "BLOCK",
      anchorTarget: "#order-items",
    },
    {
      id: "date",
      label: `Data: ${dateLabel}`,
      status:
        input.orderType === "PRONTA_ENTREGA"
          ? "OK"
          : input.pendingSummary.hasDeliveryDate
          ? "OK"
          : "BLOCK",
      anchorTarget: "#order-delivery",
    },
  ];

  if (timeLabel) {
    checklist.push({
      id: "time",
      label: `Horario: ${timeLabel}`,
      status:
        input.orderType === "PRONTA_ENTREGA"
          ? "OK"
          : timeLabel === "Sem horario"
          ? "WARN"
          : "OK",
      anchorTarget: "#order-delivery",
    });
  }

  if (input.deliveryMethod === "ENTREGA") {
    checklist.push({
      id: "address",
      label: input.addressReady ? "Endereco informado" : "Endereco pendente",
      status: input.addressReady ? "OK" : "WARN",
      anchorTarget: "#order-delivery",
    });
  } else {
    checklist.push({
      id: "pickup",
      label: "Retirada no local",
      status: "OK",
      anchorTarget: "#order-delivery",
    });
  }

  if (input.needsProduction) {
    checklist.push({
      id: "production",
      label: "Precisa produzir",
      status: "WARN",
      anchorTarget: "#order-production",
    });
  }

  if (input.needsReconfirmation) {
    checklist.push({
      id: "reconfirmation",
      label: "Reconfirmacao pendente",
      status: "BLOCK",
      anchorTarget: "#order-changes",
    });
  }

  return checklist;
}

function buildPrimaryCta(
  input: OrderDetailViewModelInput
): OrderDetailPrimaryCta {
  const isFinal = input.status === "ENTREGUE" || input.status === "CANCELADO";

  if (isFinal) {
    return {
      label: input.status === "ENTREGUE" ? "Pedido entregue" : "Pedido cancelado",
      actionId: "none",
      enabled: false,
      blockedReasons: [],
    };
  }

  if (input.pendingSummary.incomplete) {
    const blockedReasons: OrderDetailBlockedReason[] = [];
    if (!input.pendingSummary.hasItems) {
      blockedReasons.push({
        label: "Adicionar itens",
        anchorTarget: "#order-items",
        context: "edit",
      });
    }
    if (!input.pendingSummary.hasDeliveryDate) {
      blockedReasons.push({
        label: "Definir data de entrega",
        anchorTarget: "#order-delivery",
        context: "edit",
      });
    }
    return {
      label: "Completar pedido",
      actionId: "complete",
      enabled: true,
      blockedReasons,
      anchorTarget: blockedReasons[0]?.anchorTarget,
    };
  }

  if (input.needsReconfirmation) {
    return {
      label: "Revisar mudancas",
      actionId: "review_changes",
      enabled: true,
      blockedReasons: [
        {
          label: "Reconfirmacao pendente",
          anchorTarget: "#order-changes",
          context: "page",
        },
      ],
      anchorTarget: "#order-changes",
    };
  }

  if (input.status === "RASCUNHO") {
    return {
      label: "Confirmar pedido",
      actionId: "confirm",
      enabled: true,
      blockedReasons: [],
    };
  }

  if (input.status === "CONFIRMADO") {
    const label = input.needsProduction ? "Iniciar producao" : "Avancar para producao";
    return {
      label,
      actionId: "advance_status",
      enabled: true,
      blockedReasons: [],
      statusTarget: "EM_PRODUCAO",
      helpText: input.needsProduction
        ? undefined
        : "Mesmo sem itens pendentes, este passo mantem o fluxo do pedido.",
    };
  }

  if (input.status === "EM_PRODUCAO") {
    return {
      label: "Marcar pronto",
      actionId: "advance_status",
      enabled: true,
      blockedReasons: [],
      statusTarget: "PRONTO",
    };
  }

  if (input.status === "PRONTO") {
    return {
      label: "Marcar entregue",
      actionId: "advance_status",
      enabled: true,
      blockedReasons: [],
      statusTarget: "ENTREGUE",
    };
  }

  return {
    label: "Atualizar status",
    actionId: "none",
    enabled: false,
    blockedReasons: [],
  };
}

export function getOrderDetailViewModel(
  input: OrderDetailViewModelInput
): OrderDetailViewModel {
  const schedule = buildSchedule(input.deliveryDatetime, input.deliveryTime);

  const chipsRaw = [
    ...input.attention.strongReasons.map((reason) => ({
      label: reason.label,
      severity: "strong" as const,
    })),
    ...input.attention.weakReasons.map((reason) => ({
      label: reason.label,
      severity: "weak" as const,
    })),
  ];
  const chips = chipsRaw.slice(0, 5);
  const chipsOverflow = Math.max(chipsRaw.length - chips.length, 0);

  return {
    primaryCta: buildPrimaryCta(input),
    checklist: buildChecklist(input),
    chips,
    chipsOverflow,
    schedule,
  };
}
