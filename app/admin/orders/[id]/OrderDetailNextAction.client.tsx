"use client";

import { useMemo, useRef } from "react";
import NextAction from "../NextAction.client";
import type { ChecklistItem } from "../NextAction.client";
import type { OrderStatus } from "@prisma/client";
import type { OrderAttentionSummary } from "@/lib/domain/attention";
import {
  confirmOrderAction,
  reconfirmOrderAction,
  updateStatusAction,
} from "./actions";

type OrderDetailNextActionProps = {
  orderId: string;
  status: OrderStatus;
  attention: OrderAttentionSummary;
  pendingSummary: {
    hasItems: boolean;
    hasDeliveryDate: boolean;
  };
  itemsReady: boolean;
  scheduleReady: boolean;
  timeReady: boolean;
  addressReady: boolean;
  orderType: "ENCOMENDA" | "PRONTA_ENTREGA";
  deliveryMethod: "ENTREGA" | "RETIRADA";
  deliveryDatetime: Date | null;
  deliveryTime: string | null;
  customerName: string;
  itemsCount: number;
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  isFinal: boolean;
  needsReconfirmation: boolean;
  hasPayment: boolean;
  primaryActionStatus?: OrderStatus;
};

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

export default function OrderDetailNextAction({
  orderId,
  status,
  attention,
  pendingSummary,
  itemsReady,
  scheduleReady,
  timeReady,
  addressReady,
  orderType,
  deliveryMethod,
  deliveryDatetime,
  deliveryTime,
  customerName,
  itemsCount,
  subtotal,
  deliveryFee,
  total,
  isFinal,
  needsReconfirmation,
  hasPayment,
  primaryActionStatus,
}: OrderDetailNextActionProps) {
  const checklist = useMemo<ChecklistItem[]>(() => {
    const itemsLabel = itemsCount > 0
      ? `${itemsCount} ${itemsCount === 1 ? "item" : "itens"}`
      : "Nenhum item";
    const dateLabel =
      orderType === "PRONTA_ENTREGA"
        ? "Cadastro agora"
        : deliveryDatetime
        ? formatDate(deliveryDatetime)
        : "Não definida";
    const timeLabel =
      orderType === "PRONTA_ENTREGA"
        ? "Agora"
        : deliveryTime || "A confirmar";
    const addressLabel =
      deliveryMethod === "RETIRADA"
        ? "Retirada"
        : addressReady
        ? "Endereço informado"
        : "Endereço pendente";

    return [
      {
        label: `Cliente: ${customerName}`,
        status: "complete",
      },
      {
        label: `Itens: ${itemsLabel}`,
        status: itemsReady ? "complete" : "pending",
      },
      {
        label: `Data: ${dateLabel}`,
        status:
          orderType === "PRONTA_ENTREGA"
            ? "complete"
            : scheduleReady
            ? "complete"
            : "pending",
      },
      {
        label: `Horário: ${timeLabel}`,
        status:
          orderType === "PRONTA_ENTREGA"
            ? "optional"
            : timeReady
            ? "complete"
            : "optional",
      },
      {
        label: `Entrega: ${addressLabel}`,
        status:
          deliveryMethod === "RETIRADA"
            ? "complete"
            : addressReady
            ? "complete"
            : "warning",
      },
    ];
  }, [
    customerName,
    itemsCount,
    itemsReady,
    orderType,
    scheduleReady,
    timeReady,
    deliveryMethod,
    addressReady,
    deliveryDatetime,
    deliveryTime,
  ]);

  const confirmFormRef = useRef<HTMLFormElement>(null);
  const reconfirmFormRef = useRef<HTMLFormElement>(null);
  const statusFormRef = useRef<HTMLFormElement>(null);

  const primaryAction = useMemo(() => {
    if (isFinal) {
      return {
        label: "Pedido finalizado",
        onClick: () => {},
        disabled: true,
      };
    }
    if (needsReconfirmation) {
      return {
        label: "Reconfirmar pedido",
        onClick: () => {
          reconfirmFormRef.current?.requestSubmit();
        },
        disabled: false,
      };
    }
    if (status === "RASCUNHO") {
      const disabled = !pendingSummary.hasItems || !pendingSummary.hasDeliveryDate;
      return {
        label: "Confirmar pedido",
        onClick: () => {
          confirmFormRef.current?.requestSubmit();
        },
        disabled,
      };
    }
    if (status === "CONFIRMADO") {
      const disabled = !pendingSummary.hasItems || !pendingSummary.hasDeliveryDate;
      return {
        label: "Iniciar produção",
        onClick: () => {
          if (statusFormRef.current) {
            const statusInput = statusFormRef.current.querySelector('input[name="status"]') as HTMLInputElement;
            if (statusInput) statusInput.value = "EM_PRODUCAO";
            statusFormRef.current.requestSubmit();
          }
        },
        disabled,
      };
    }
    if (status === "EM_PRODUCAO") {
      const disabled = attention.strongReasons.length > 0;
      return {
        label: "Marcar pronto",
        onClick: () => {
          if (statusFormRef.current) {
            const statusInput = statusFormRef.current.querySelector('input[name="status"]') as HTMLInputElement;
            if (statusInput) statusInput.value = "PRONTO";
            statusFormRef.current.requestSubmit();
          }
        },
        disabled,
      };
    }
    if (status === "PRONTO") {
      const disabled = attention.strongReasons.length > 0;
      return {
        label: "Marcar entregue",
        onClick: () => {
          if (statusFormRef.current) {
            const statusInput = statusFormRef.current.querySelector('input[name="status"]') as HTMLInputElement;
            if (statusInput) statusInput.value = "ENTREGUE";
            statusFormRef.current.requestSubmit();
          }
        },
        disabled,
      };
    }
    return {
      label: "Atualizar status",
      onClick: () => {},
      disabled: true,
    };
  }, [
    isFinal,
    needsReconfirmation,
    status,
    pendingSummary,
    attention.strongReasons.length,
  ]);

  return (
    <>
      {status === "RASCUNHO" && (
        <form ref={confirmFormRef} action={confirmOrderAction} style={{ display: "none" }}>
          <input type="hidden" name="orderId" value={orderId} />
        </form>
      )}
      {needsReconfirmation && (
        <form ref={reconfirmFormRef} action={reconfirmOrderAction} style={{ display: "none" }}>
          <input type="hidden" name="orderId" value={orderId} />
        </form>
      )}
      {(status === "CONFIRMADO" || status === "EM_PRODUCAO" || status === "PRONTO") && (
        <form ref={statusFormRef} action={updateStatusAction} style={{ display: "none" }}>
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="status" value={primaryActionStatus || ""} />
          {status === "PRONTO" && !hasPayment && (
            <input type="checkbox" name="markPaid" value="1" defaultChecked={false} />
          )}
        </form>
      )}
      <NextAction
        checklist={checklist}
        primaryAction={primaryAction}
        summary={{
          subtotal,
          tax: deliveryFee ? Number(deliveryFee) : undefined,
          total,
        }}
        status={status}
        attention={attention}
        whenToShow={isFinal ? "custom" : "always"}
        whenNotToShow={() => isFinal}
      />
    </>
  );
}
