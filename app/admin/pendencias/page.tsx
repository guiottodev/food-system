import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary, hasStrongAttention } from "@/lib/domain/attention";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { OrderStatus } from "@prisma/client";
import OrdersTableClient from "../orders/OrdersTableClient";
import PendenciasFilters from "./PendenciasFilters.client";
import styles from "../_styles/adminPrimitives.module.css";

type SearchParams = {
  type?: string;
};

const statusLabel: Record<OrderStatus, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em producao",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const deliveryMethodLabel = {
  ENTREGA: "Entrega",
  RETIRADA: "Retirada",
};

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(value);
}

function formatDeliveryLabel(value?: Date | null, time?: string | null) {
  if (!value) return "-";
  const dateLabel = formatDate(value);
  const trimmedTime = time?.trim();
  if (!trimmedTime || trimmedTime === DEFAULT_DELIVERY_TIME) {
    return dateLabel;
  }
  return `${dateLabel} ${trimmedTime}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type PendingType = "all" | "INCOMPLETE" | "ALTERADO_APOS_CONFIRMACAO";

function normalizeType(value: string | undefined): PendingType {
  if (value === "INCOMPLETE" || value === "ALTERADO_APOS_CONFIRMACAO") {
    return value;
  }
  return "all";
}

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const typeParam = normalizeType(sp?.type);

  const orders = await prisma.order.findMany({
    where: {
      status: {
        notIn: ["ENTREGUE", "CANCELADO"],
      },
    },
    orderBy: {
      deliveryDatetime: "asc",
    },
    include: {
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          snapshotUnitPrice: true,
          lineTotal: true,
          snapshotSkuName: true,
          snapshotProductName: true,
          snapshotUnitLabel: true,
          snapshotUnitType: true,
        },
      },
    },
  });

  const entries = orders.map((order) => ({
    order,
    attention: getOrderAttentionSummary(order),
  }));
  const strongEntries = entries.filter((entry) =>
    hasStrongAttention(entry.attention)
  );
  const filtered =
    typeParam === "all"
      ? strongEntries
      : strongEntries.filter((entry) =>
          entry.attention.strongReasons.some((reason) => reason.type === typeParam)
        );

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pendencias</h1>
        <Link href="/admin/orders">Ver pedidos</Link>
      </div>

      <section className={styles.panel}>
        <PendenciasFilters initialType={typeParam} />
        <p className={styles.textMuted}>
          {filtered.length} pendencia(s) forte(s)
        </p>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>Sem pendencias fortes.</div>
        ) : (
          <OrdersTableClient
            columns={7}
            orders={filtered.map(({ order, attention }) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customer.name,
              customerPhone: order.customer.phone,
              deliveryMethodLabel: deliveryMethodLabel[order.deliveryMethod],
              status: order.status,
              statusLabel: statusLabel[order.status],
              incomplete: attention.strongReasons.some(
                (reason) => reason.type === "INCOMPLETE"
              ),
              altered: attention.strongReasons.some(
                (reason) => reason.type === "ALTERADO_APOS_CONFIRMACAO"
              ),
              deliveryDatetime: formatDeliveryLabel(
                order.deliveryDatetime,
                order.deliveryTime
              ),
              totalLabel: formatCurrency(Number(order.total)),
              items: order.items.map((item) => ({
                id: item.id,
                name: item.snapshotProductName
                  ? `${item.snapshotProductName} - ${item.snapshotSkuName}`
                  : item.snapshotSkuName,
                quantity: Number(item.quantity),
                unitLabel: item.snapshotUnitLabel,
                unitType: item.snapshotUnitType,
                priceAtTime: item.snapshotUnitPrice
                  ? Number(item.snapshotUnitPrice)
                  : null,
                lineTotal: item.lineTotal ? Number(item.lineTotal) : null,
              })),
              subtotal: Number(order.subtotal),
              deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : 0,
              total: Number(order.total),
              attention: attention.strongReasons.map((reason) => reason.label),
            }))}
          />
        )}
      </section>
    </main>
  );
}
