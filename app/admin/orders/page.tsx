import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import {
  computeOrderStockStatus,
  computeUnavailableItemsForOrders,
} from "@/lib/domain/production";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { normalizePhoneDigits } from "@/lib/phone";
import { DeliveryMethod, OrderStatus, OrderType, Prisma } from "@prisma/client";
import OrdersTableClient from "./OrdersTableClient";
import OrdersFilters from "./OrdersFilters.client";
import layoutStyles from "./orders.module.css";
import styles from "../_styles/adminPrimitives.module.css";

type OrdersSearchParams = {
  period?: string;
  deliveryStart?: string;
  deliveryEnd?: string;
  view?: string;
  status?: string;
  q?: string;
  dir?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  deliveryDate?: string;
  deliveryRange?: string;
  attention?: string;
  attentionType?: string;
  orderType?: string;
  deliveryMethod?: string;
};

const PAGE_SIZES = [15, 30, 50];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
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

const statusOptions = [
  { value: "ALL", label: "Todos" },
  { value: OrderStatus.RASCUNHO, label: "Rascunho / Anotado" },
  { value: OrderStatus.CONFIRMADO, label: "Confirmado / Ready" },
  { value: OrderStatus.EM_PRODUCAO, label: "Em producao" },
  { value: OrderStatus.PRONTO, label: "Pronto" },
  { value: OrderStatus.ENTREGUE, label: "Entregue" },
  { value: OrderStatus.CANCELADO, label: "Cancelado" },
];

const statusLabel: Record<OrderStatus, string> = {
  RASCUNHO: "Rascunho",
  CONFIRMADO: "Confirmado",
  EM_PRODUCAO: "Em producao",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const orderInclude = {
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
} as const;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

const deliveryMethodLabel = {
  ENTREGA: "Entrega",
  RETIRADA: "Retirada",
};

function normalizeView(view?: string) {
  if (view === "all") return "all";
  if (view === "previous" || view === "anteriores") return "previous";
  if (view === "upcoming") return "upcoming";
  return "upcoming";
}

type PeriodValue = "upcoming" | "today" | "range" | "history";
type SortValue = "delivery_asc" | "delivery_desc" | "created_desc";

function normalizePeriod(value?: string): PeriodValue {
  if (value === "today") return "today";
  if (value === "range") return "range";
  if (value === "history") return "history";
  return "upcoming";
}

function parseSort(value: string | undefined, legacyDir: string | undefined): SortValue {
  if (value === "delivery_desc") return "delivery_desc";
  if (value === "created_desc") return "created_desc";
  if (value === "delivery_asc") return "delivery_asc";
  if (legacyDir === "desc") return "delivery_desc";
  return "delivery_asc";
}

function normalizeOrderType(value: string | undefined) {
  if (value === "ENCOMENDA") return "ENCOMENDA";
  if (value === "PRONTA_ENTREGA") return "PRONTA_ENTREGA";
  return "all";
}

function normalizeDeliveryMethod(value: string | undefined) {
  if (value === "ENTREGA") return "ENTREGA";
  if (value === "RETIRADA") return "RETIRADA";
  return "all";
}

function parseDeliveryRange(value: string | undefined) {
  if (value === "week") return "week";
  if (value === "month") return "month";
  if (value === "day") return "day";
  return "";
}

function parseDateParam(value: string | undefined) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
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

function parsePage(value: string | undefined) {
  const page = Number(value ?? "1");
  if (Number.isNaN(page) || page < 1) return 1;
  return Math.floor(page);
}

function parsePageSize(value: string | undefined) {
  const size = Number(value ?? PAGE_SIZES[0]);
  return PAGE_SIZES.includes(size) ? size : PAGE_SIZES[0];
}

const attentionTypeOptions = [
  "all",
  "INCOMPLETE",
  "ALTERADO_APOS_CONFIRMACAO",
  "PRECISA_PRODUZIR",
  "MISSING_TIME",
  "MISSING_ADDRESS",
] as const;

type AttentionFilter =
  | "all"
  | "with"
  | (typeof attentionTypeOptions)[number];

function normalizeAttention(
  value: string | undefined,
  legacyType?: string | undefined
): AttentionFilter {
  if (value === "with") return "with";
  if (value && attentionTypeOptions.includes(value as (typeof attentionTypeOptions)[number])) {
    return value as AttentionFilter;
  }
  if (legacyType && attentionTypeOptions.includes(legacyType as (typeof attentionTypeOptions)[number])) {
    return legacyType as AttentionFilter;
  }
  return "all";
}

function matchesAttentionFilter(
  attention: ReturnType<typeof getOrderAttentionSummary>,
  attentionFilter: AttentionFilter,
  needsProduction: boolean
) {
  if (attentionFilter === "with") {
    return attention.hasAttention || needsProduction;
  }
  if (attentionFilter === "PRECISA_PRODUZIR") {
    return needsProduction;
  }
  if (attentionFilter !== "all") {
    return attention.reasons.some((reason) => reason.type === attentionFilter);
  }
  return true;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: Promise<OrdersSearchParams> | OrdersSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const view = normalizeView(sp?.view);
  const statusParam = sp?.status ?? "ALL";
  const query = (sp?.q ?? "").trim();
  const sort = parseSort(sp?.sort, sp?.dir);
  const page = parsePage(sp?.page);
  const pageSize = parsePageSize(sp?.pageSize);
  const deliveryDateParam = sp?.deliveryDate ?? "";
  const deliveryStartParam = sp?.deliveryStart ?? "";
  const deliveryEndParam = sp?.deliveryEnd ?? "";
  const periodParam = normalizePeriod(sp?.period);
  const attentionParam = normalizeAttention(sp?.attention, sp?.attentionType);
  const orderTypeParam = normalizeOrderType(sp?.orderType);
  const deliveryMethodParam = normalizeDeliveryMethod(sp?.deliveryMethod);
  const legacyRange =
    sp?.view === "week" ? "week" : sp?.view === "day" ? "day" : "";
  const deliveryRangeParam = parseDeliveryRange(
    sp?.deliveryRange ?? legacyRange
  );

  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = endOfDay(now);
  const endYesterday = endOfDay(addDays(now, -1));
  const startPrevious = startOfDay(addDays(now, -30));
  const daysToSunday = (7 - startToday.getDay()) % 7;
  const endWeek = endOfDay(addDays(startToday, daysToSunday));
  const startMonth = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  // Ranges baseadas em data local (inicio/fim do dia) para inclusao correta.
  let dateFilter: { gte?: Date; lte?: Date } = {};
  const parsedDeliveryDate = parseDateParam(deliveryDateParam);
  const parsedDeliveryStart = parseDateParam(deliveryStartParam);
  const parsedDeliveryEnd = parseDateParam(deliveryEndParam);
  const hasNewPeriod =
    Boolean(sp?.period) ||
    Boolean(deliveryStartParam) ||
    Boolean(deliveryEndParam);
  if (hasNewPeriod) {
    if (periodParam === "today") {
      dateFilter = { gte: startToday, lte: endToday };
    } else if (periodParam === "range") {
      dateFilter = {
        ...(parsedDeliveryStart ? { gte: startOfDay(parsedDeliveryStart) } : {}),
        ...(parsedDeliveryEnd ? { lte: endOfDay(parsedDeliveryEnd) } : {}),
      };
    } else if (periodParam === "history") {
      dateFilter = { lte: endToday };
    } else {
      dateFilter = { gte: startToday };
    }
  } else if (parsedDeliveryDate) {
    dateFilter = {
      gte: startOfDay(parsedDeliveryDate),
      lte: endOfDay(parsedDeliveryDate),
    };
  } else if (deliveryRangeParam === "week") {
    dateFilter = { gte: startToday, lte: endWeek };
  } else if (deliveryRangeParam === "month") {
    dateFilter = { gte: startMonth, lte: endToday };
  } else if (deliveryRangeParam === "day") {
    dateFilter = { gte: startToday, lte: endToday };
  } else if (view === "previous") {
    dateFilter = { gte: startPrevious, lte: endYesterday };
  } else if (view === "all") {
    dateFilter = {};
  } else {
    dateFilter = { gte: startToday };
  }

  const effectiveStatusParam =
    periodParam === "history" && hasNewPeriod ? OrderStatus.ENTREGUE : statusParam;
  const statusFilter =
    effectiveStatusParam !== "ALL"
      ? {
          status: effectiveStatusParam as OrderStatus,
        }
      : {};

  const orderTypeFilter =
    orderTypeParam !== "all"
      ? {
          orderType: orderTypeParam as OrderType,
        }
      : {};

  const deliveryMethodFilter =
    deliveryMethodParam !== "all"
      ? {
          deliveryMethod: deliveryMethodParam as DeliveryMethod,
        }
      : {};

  const phoneQuery = normalizePhoneDigits(query);
  const queryFilter = query
    ? {
        OR: [
          {
            orderNumber: {
              contains: query,
            },
          },
          {
            customer: {
              name: {
                contains: query,
              },
            },
          },
          ...(phoneQuery
            ? [
                {
                  customer: {
                    phone: {
                      contains: phoneQuery,
                    },
                  },
                },
              ]
            : []),
        ],
      }
    : {};

  const where = {
    deliveryDatetime: dateFilter,
    ...statusFilter,
    ...queryFilter,
    ...orderTypeFilter,
    ...deliveryMethodFilter,
  };

  const shouldFilterByAttention = attentionParam !== "all";

  const orderBy: Prisma.OrderOrderByWithRelationInput =
    sort === "created_desc"
      ? { createdAt: "desc" }
      : { deliveryDatetime: sort === "delivery_desc" ? "desc" : "asc" };

  let orders: Array<{
    order: OrderWithRelations;
    attention: ReturnType<typeof getOrderAttentionSummary>;
    stockStatus: { needsProduction: boolean; deliveredShortage: boolean };
  }> = [];
  let totalCount = 0;

  if (shouldFilterByAttention) {
    // Otimização: buscar em chunks para evitar carregar todos os pedidos
    // Buscar até 10x o pageSize para ter margem de segurança no filtro
    const maxFetch = Math.max(pageSize * 10, 500);
    const allOrders = await prisma.order.findMany({
      where,
      orderBy,
      take: maxFetch,
      include: orderInclude,
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
    const decorated = allOrders.map((order) => ({
      order,
      attention: getOrderAttentionSummary({
        ...order,
        hasUnavailableItems:
          availabilityMap.get(order.id)?.hasUnavailableItems ?? false,
        hasStockShortage:
          stockStatusMap.get(order.id)?.deliveredShortage ?? false,
      }),
      stockStatus: stockStatusMap.get(order.id) ?? {
        needsProduction: false,
        deliveredShortage: false,
      },
    }));
    const filtered = decorated.filter((entry) =>
      matchesAttentionFilter(
        entry.attention,
        attentionParam,
        entry.stockStatus.needsProduction
      )
    );
    // Se encontrou menos que o necessário e há mais pedidos, buscar total para contagem
    if (filtered.length < pageSize && allOrders.length === maxFetch) {
      const totalCountResult = await prisma.order.count({ where });
      // Se há mais pedidos além dos buscados, estimar total baseado na proporção
      if (totalCountResult > maxFetch) {
        const ratio = filtered.length / allOrders.length;
        totalCount = Math.ceil(totalCountResult * ratio);
      } else {
        totalCount = filtered.length;
      }
    } else {
      totalCount = filtered.length;
    }
    const startIndex = (page - 1) * pageSize;
    orders = filtered.slice(startIndex, startIndex + pageSize);
  } else {
    const [orderRows, count] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
    totalCount = count;
    const orderInputs = orderRows.map((order) => ({
      id: order.id,
      status: order.status,
      items: order.items,
    }));
    const [availabilityMap, stockStatusMap] = await Promise.all([
      computeUnavailableItemsForOrders(prisma, orderInputs),
      computeOrderStockStatus(prisma, orderInputs),
    ]);
    orders = orderRows.map((order) => ({
      order,
      attention: getOrderAttentionSummary({
        ...order,
        hasUnavailableItems:
          availabilityMap.get(order.id)?.hasUnavailableItems ?? false,
        hasStockShortage:
          stockStatusMap.get(order.id)?.deliveredShortage ?? false,
      }),
      stockStatus: stockStatusMap.get(order.id) ?? {
        needsProduction: false,
        deliveredShortage: false,
      },
    }));
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = totalCount === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endIndex =
    totalCount === 0
      ? 0
      : Math.min(clampedPage * pageSize, totalCount);

  const baseParams = {
    q: query || undefined,
    status: effectiveStatusParam !== "ALL" ? effectiveStatusParam : undefined,
    sort: sort !== "delivery_asc" ? sort : undefined,
    pageSize: pageSize !== PAGE_SIZES[0] ? pageSize : undefined,
    deliveryDate: !hasNewPeriod && deliveryDateParam ? deliveryDateParam : undefined,
    deliveryRange:
      !hasNewPeriod && deliveryRangeParam ? deliveryRangeParam : undefined,
    deliveryStart: deliveryStartParam || undefined,
    deliveryEnd: deliveryEndParam || undefined,
    period: hasNewPeriod ? periodParam : undefined,
    attention: attentionParam !== "all" ? attentionParam : undefined,
    orderType: orderTypeParam !== "all" ? orderTypeParam : undefined,
    deliveryMethod: deliveryMethodParam !== "all" ? deliveryMethodParam : undefined,
    view: hasNewPeriod ? undefined : view,
  };

  const pageLink = (nextPage: number) =>
    withQuery("/admin/orders", { ...baseParams, page: nextPage });

  // Calcular KPIs
  const totalValue = orders.reduce((sum, { order }) => sum + Number(order.total), 0);
  const pendingCount = orders.filter(({ attention }) => attention.strongReasons.length > 0).length;
  const readyCount = orders.filter(({ order }) => order.status === "PRONTO").length;
  const inProductionCount = orders.filter(({ order }) => order.status === "EM_PRODUCAO").length;

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <h1 className={styles.pageTitle}>Pedidos</h1>
        <div className={layoutStyles.kpiBar}>
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{totalCount}</span>
            <span className={layoutStyles.kpiLabel}>pedidos</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
            </span>
            <span className={layoutStyles.kpiLabel}>total</span>
          </div>
          {pendingCount > 0 && (
            <>
              <div className={layoutStyles.kpiDivider} />
              <div className={`${layoutStyles.kpiItem} ${layoutStyles.kpiWarning}`}>
                <span className={layoutStyles.kpiValue}>{pendingCount}</span>
                <span className={layoutStyles.kpiLabel}>pendentes</span>
              </div>
            </>
          )}
          {readyCount > 0 && (
            <>
              <div className={layoutStyles.kpiDivider} />
              <div className={`${layoutStyles.kpiItem} ${layoutStyles.kpiSuccess}`}>
                <span className={layoutStyles.kpiValue}>{readyCount}</span>
                <span className={layoutStyles.kpiLabel}>prontos</span>
              </div>
            </>
          )}
        </div>
      </div>

      <section className={styles.panel}>
        <OrdersFilters
          statusOptions={statusOptions}
          pageSizes={PAGE_SIZES}
          initialView={view}
          initialPeriod={periodParam}
          initialQuery={query}
          initialStatus={effectiveStatusParam}
          initialSort={sort}
          initialPageSize={pageSize}
          initialDeliveryDate={deliveryDateParam}
          initialDeliveryRange={deliveryRangeParam}
          initialDeliveryStart={deliveryStartParam}
          initialDeliveryEnd={deliveryEndParam}
          initialAttention={attentionParam}
          initialOrderType={orderTypeParam}
          initialDeliveryMethod={deliveryMethodParam}
        />

        {orders.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIcon}>📋</div>
            <div className={layoutStyles.emptyStateTitle}>Nenhum pedido encontrado</div>
            <div className={layoutStyles.emptyStateText}>
              Tente ajustar os filtros ou criar um novo pedido.
            </div>
            <Link
              href="/admin/orders/new"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Criar pedido
            </Link>
          </div>
        ) : (
          <OrdersTableClient
            columns={7}
            orders={orders.map(({ order, attention, stockStatus }) => {
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
        )}
      </section>

      <div className={layoutStyles.paginationRow}>
        <div className={layoutStyles.paginationControls}>
          {clampedPage > 1 ? (
            <Link
              href={pageLink(clampedPage - 1)}
              className={layoutStyles.paginationButton}
            >
              <ChevronLeft size={18} />
              <span>Anterior</span>
            </Link>
          ) : (
            <span className={layoutStyles.paginationButtonDisabled}>
              <ChevronLeft size={18} />
              <span>Anterior</span>
            </span>
          )}
          <span className={layoutStyles.paginationInfo}>
            Pagina <strong>{clampedPage}</strong> de <strong>{totalPages}</strong>
          </span>
          {clampedPage < totalPages ? (
            <Link
              href={pageLink(clampedPage + 1)}
              className={layoutStyles.paginationButton}
            >
              <span>Proxima</span>
              <ChevronRight size={18} />
            </Link>
          ) : (
            <span className={layoutStyles.paginationButtonDisabled}>
              <span>Proxima</span>
              <ChevronRight size={18} />
            </span>
          )}
        </div>
        <span className={layoutStyles.paginationMeta}>
          Mostrando {startIndex}-{endIndex} de {totalCount}
        </span>
      </div>
    </main>
  );
}
