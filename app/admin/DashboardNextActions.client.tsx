"use client";

import Link from "next/link";
import NextAction from "./orders/NextAction.client";
import type { ChecklistItem } from "./orders/NextAction.client";
import type { OrderStatus } from "@prisma/client";
import type { OrderAttentionSummary } from "@/lib/domain/attention";

type DashboardOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  attention: OrderAttentionSummary;
  customerName: string;
  itemsCount: number;
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  deliveryDatetime: Date | null;
  deliveryTime: string | null;
  orderType: "ENCOMENDA" | "PRONTA_ENTREGA";
  deliveryMethod: "ENTREGA" | "RETIRADA";
  addressText: string | null;
  addressCity: string | null;
  needsReconfirmation: boolean;
  hasPayment: boolean;
};

type DashboardNextActionsProps = {
  orders: DashboardOrder[];
};

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

export default function DashboardNextActions({ orders }: DashboardNextActionsProps) {
  if (orders.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {orders.slice(0, 3).map((order) => {
        const scheduleReady =
          order.orderType === "PRONTA_ENTREGA"
            ? true
            : Boolean(order.deliveryDatetime);
        const addressReady =
          order.deliveryMethod !== "ENTREGA"
            ? true
            : Boolean(order.addressText?.trim()) && Boolean(order.addressCity?.trim());

        const checklist: ChecklistItem[] = [
          {
            label: `Cliente: ${order.customerName}`,
            status: "complete",
          },
          {
            label: `Itens: ${order.itemsCount} ${order.itemsCount === 1 ? "item" : "itens"}`,
            status: order.itemsCount > 0 ? "complete" : "pending",
          },
          {
            label: `Data: ${
              order.orderType === "PRONTA_ENTREGA"
                ? "Cadastro agora"
                : order.deliveryDatetime
                ? formatDate(order.deliveryDatetime)
                : "Não definida"
            }`,
            status:
              order.orderType === "PRONTA_ENTREGA"
                ? "complete"
                : scheduleReady
                ? "complete"
                : "pending",
          },
          {
            label: `Entrega: ${
              order.deliveryMethod === "RETIRADA"
                ? "Retirada"
                : addressReady
                ? "Endereço informado"
                : "Endereço pendente"
            }`,
            status:
              order.deliveryMethod === "RETIRADA"
                ? "complete"
                : addressReady
                ? "complete"
                : "warning",
          },
        ];

        const primaryAction = (() => {
          if (order.status === "ENTREGUE" || order.status === "CANCELADO") {
            return {
              label: "Ver pedido",
              onClick: () => {
                window.location.href = `/admin/orders/${order.id}`;
              },
              disabled: false,
            };
          }
          if (order.needsReconfirmation) {
            return {
              label: "Reconfirmar pedido",
              onClick: () => {
                window.location.href = `/admin/orders/${order.id}`;
              },
              disabled: false,
            };
          }
          if (order.status === "RASCUNHO") {
            const disabled = order.itemsCount === 0 || !scheduleReady;
            return {
              label: "Confirmar pedido",
              onClick: () => {
                window.location.href = `/admin/orders/${order.id}`;
              },
              disabled,
            };
          }
          return {
            label: "Ver pedido",
            onClick: () => {
              window.location.href = `/admin/orders/${order.id}`;
            },
            disabled: false,
          };
        })();

        return (
          <div key={order.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}>
            <div style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: "var(--fw-semibold)", color: "var(--text-primary)", textDecoration: "none" }}>
                {order.orderNumber}
              </Link>
            </div>
            <NextAction
              checklist={checklist}
              primaryAction={primaryAction}
              summary={{
                subtotal: order.subtotal,
                tax: order.deliveryFee ? Number(order.deliveryFee) : undefined,
                total: order.total,
              }}
              status={order.status}
              attention={order.attention}
              whenToShow="always"
            />
          </div>
        );
      })}
    </div>
  );
}
