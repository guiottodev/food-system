import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import {
  computeOrderStockStatus,
  computeUnavailableItemsForOrders,
} from "@/lib/domain/production";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { OrderStatus } from "@prisma/client";
import OrdersTableClient from "../orders/OrdersTableClient";
import PendenciasFilters from "./PendenciasFilters.client";
import layoutStyles from "../orders/orders.module.css";
import styles from "../_styles/adminPrimitives.module.css";

type SearchParams = {
  type?: string;
  page?: string;
  pageSize?: string;
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

const PAGE_SIZES = [15, 30, 50];

function parsePage(value: string | undefined) {
  const page = Number(value ?? "1");
  if (Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

function parsePageSize(value: string | undefined) {
  const size = Number(value ?? PAGE_SIZES[0]);
  return PAGE_SIZES.includes(size) ? size : PAGE_SIZES[0];
}

function withQuery(
  base: string,
  params: Record<string, string | number | undefined | null>
) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    sp.set(key, String(value));
  });
  const query = sp.toString();
  return query ? `${base}?${query}` : base;
}

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

type PendingType =
  | "all"
  | "INCOMPLETE"
  | "ALTERADO_APOS_CONFIRMACAO"
  | "PRECISA_PRODUZIR";

function normalizeType(value: string | undefined): PendingType {
  if (
    value === "INCOMPLETE" ||
    value === "ALTERADO_APOS_CONFIRMACAO" ||
    value === "PRECISA_PRODUZIR"
  ) {
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
  const page = parsePage(sp?.page);
  const pageSize = parsePageSize(sp?.pageSize);

  // Buscar todos os pedidos ativos (sem paginação ainda, pois precisamos filtrar por atenção)
  const allOrders = await prisma.order.findMany({
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
          skuId: true,
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

  const orderInputs = allOrders.map((order) => ({
    id: order.id,
    status: order.status,
    items: order.items,
  }));
  const [availabilityMap, stockStatusMap] = await Promise.all([
    computeUnavailableItemsForOrders(prisma, orderInputs),
    computeOrderStockStatus(prisma, orderInputs),
  ]);

  const entries = allOrders.map((order) => {
    const hasUnavailableItems =
      availabilityMap.get(order.id)?.hasUnavailableItems ?? false;
    return {
      order,
      attention: getOrderAttentionSummary({
        ...order,
        hasUnavailableItems,
        hasStockShortage:
          stockStatusMap.get(order.id)?.deliveredShortage ?? false,
      }),
      stockStatus: stockStatusMap.get(order.id) ?? {
        needsProduction: false,
        deliveredShortage: false,
      },
    };
  });

  const filtered =
    typeParam === "all"
      ? entries.filter(
          (entry) => entry.attention.hasAttention || entry.stockStatus.needsProduction
        )
      : typeParam === "PRECISA_PRODUZIR"
      ? entries.filter((entry) => entry.stockStatus.needsProduction)
      : entries.filter((entry) =>
          entry.attention.strongReasons.some((reason) => reason.type === typeParam)
        );

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = totalCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endIndex =
    totalCount === 0 ? 0 : Math.min(clampedPage * pageSize, totalCount);

  const paginatedOrders = filtered.slice(
    (clampedPage - 1) * pageSize,
    clampedPage * pageSize
  );

  const baseParams = {
    type: typeParam !== "all" ? typeParam : undefined,
    pageSize: pageSize !== PAGE_SIZES[0] ? pageSize : undefined,
  };

  const pageLink = (nextPage: number) =>
    withQuery("/admin/pendencias", { ...baseParams, page: nextPage });

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pendencias</h1>
        <Link href="/admin/orders">Ver pedidos</Link>
      </div>

      <section className={styles.panel}>
        <PendenciasFilters initialType={typeParam} />
        <p className={styles.textMuted}>
          Mostrando {startIndex}-{endIndex} de {totalCount} pendencia(s)
        </p>

        {paginatedOrders.length === 0 ? (
          <div className={styles.emptyState}>Sem pendencias.</div>
        ) : (
          <>
            <OrdersTableClient
              columns={7}
              orders={paginatedOrders.map(({ order, attention, stockStatus }) => {
                const hasBlocking = attention.strongReasons.length > 0;
                const operationalTag = hasBlocking
                  ? "Incompleto"
                  : stockStatus.needsProduction
                  ? "Precisa produzir"
                  : undefined;
                const operationalTagTone = hasBlocking
                  ? "danger"
                  : stockStatus.needsProduction
                  ? "warning"
                  : undefined;
                return {
                  id: order.id,
                  orderNumber: order.orderNumber,
                  customerName: order.customer.name,
                  customerPhone: order.customer.phone,
                  deliveryMethodLabel: deliveryMethodLabel[order.deliveryMethod],
                  status: order.status,
                  statusLabel: statusLabel[order.status],
                  operationalTag,
                  operationalTagTone,
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
                  attention: attention.reasons
                    .filter(
                      (reason) =>
                        reason.type !== "UNAVAILABLE_ITEMS" &&
                        reason.type !== "SALDO_INSUFICIENTE"
                    )
                    .map((reason) => reason.label),
                };
              })}
            />
            {totalPages > 1 ? (
              <div className={layoutStyles.paginationRow}>
                <div className={layoutStyles.paginationControls}>
                  <Link href={pageLink(Math.max(1, clampedPage - 1))}>
                    Anterior
                  </Link>
                  <span>
                    Pagina {clampedPage} de {totalPages}
                  </span>
                  <Link href={pageLink(Math.min(totalPages, clampedPage + 1))}>
                    Proxima
                  </Link>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
