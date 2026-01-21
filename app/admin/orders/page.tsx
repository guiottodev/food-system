import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary } from "@/lib/domain/attention";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { OrderStatus, Prisma } from "@prisma/client";
import OrdersTableClient from "./OrdersTableClient";
import OrdersFilters from "./OrdersFilters.client";
import styles from "../_styles/adminPrimitives.module.css";

type OrdersSearchParams = {
  view?: string;
  status?: string;
  q?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
  deliveryDate?: string;
  deliveryRange?: string;
  attention?: string;
  attentionType?: string;
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
  { value: OrderStatus.RASCUNHO, label: "Rascunho" },
  { value: OrderStatus.CONFIRMADO, label: "Confirmado" },
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

function parseDir(value: string | undefined) {
  return value === "desc" ? "desc" : "asc";
}

function normalizeAttention(value: string | undefined) {
  return value === "with" ? "with" : "all";
}

const attentionTypeOptions = [
  "all",
  "INCOMPLETE",
  "ALTERADO_APOS_CONFIRMACAO",
  "MISSING_TIME",
  "MISSING_ADDRESS",
] as const;

function normalizeAttentionType(value: string | undefined) {
  if (attentionTypeOptions.includes(value as typeof attentionTypeOptions[number])) {
    return value as typeof attentionTypeOptions[number];
  }
  return "all";
}

function matchesAttentionFilter(
  attention: ReturnType<typeof getOrderAttentionSummary>,
  attentionFilter: ReturnType<typeof normalizeAttention>,
  attentionType: ReturnType<typeof normalizeAttentionType>
) {
  if (attentionType !== "all") {
    return attention.reasons.some((reason) => reason.type === attentionType);
  }
  if (attentionFilter === "with") {
    return attention.hasAttention;
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
  const dir = parseDir(sp?.dir);
  const page = parsePage(sp?.page);
  const pageSize = parsePageSize(sp?.pageSize);
  const deliveryDateParam = sp?.deliveryDate ?? "";
  const attentionParam = normalizeAttention(sp?.attention);
  const attentionTypeParam = normalizeAttentionType(sp?.attentionType);
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
  if (parsedDeliveryDate) {
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
  } else if (view === "upcoming") {
    dateFilter = { gte: startToday };
  } else if (view === "previous") {
    dateFilter = { gte: startPrevious, lte: endYesterday };
  } else if (view === "all") {
    dateFilter = {};
  }

  const statusFilter =
    statusParam !== "ALL"
      ? {
          status: statusParam as OrderStatus,
        }
      : {};

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
          {
            customer: {
              phone: {
                contains: query,
              },
            },
          },
        ],
      }
    : {};

  const where = {
    deliveryDatetime: dateFilter,
    ...statusFilter,
    ...queryFilter,
  };

  const shouldFilterByAttention =
    attentionParam !== "all" || attentionTypeParam !== "all";

  let orders: Array<{
    order: OrderWithRelations;
    attention: ReturnType<typeof getOrderAttentionSummary>;
  }> = [];
  let totalCount = 0;

  if (shouldFilterByAttention) {
    const allOrders = await prisma.order.findMany({
      where,
      orderBy: {
        deliveryDatetime: dir,
      },
      include: orderInclude,
    });
    const decorated = allOrders.map((order) => ({
      order,
      attention: getOrderAttentionSummary(order),
    }));
    const filtered = decorated.filter((entry) =>
      matchesAttentionFilter(entry.attention, attentionParam, attentionTypeParam)
    );
    totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    orders = filtered.slice(startIndex, startIndex + pageSize);
  } else {
    const [orderRows, count] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: {
          deliveryDatetime: dir,
        },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: orderInclude,
      }),
      prisma.order.count({ where }),
    ]);
    totalCount = count;
    orders = orderRows.map((order) => ({
      order,
      attention: getOrderAttentionSummary(order),
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
    q: query,
    status: statusParam,
    dir,
    pageSize,
    view,
    deliveryDate: deliveryDateParam,
    deliveryRange: deliveryRangeParam || undefined,
    attention: attentionParam,
    attentionType: attentionTypeParam,
  };

  const pageLink = (nextPage: number) =>
    withQuery("/admin/orders", { ...baseParams, page: nextPage });

  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>Pedidos</h1>

      <section className={styles.panel}>
        <OrdersFilters
          statusOptions={statusOptions}
          pageSizes={PAGE_SIZES}
          initialView={view}
          initialQuery={query}
          initialStatus={statusParam}
          initialDir={dir}
          initialPageSize={pageSize}
          initialDeliveryDate={deliveryDateParam}
          initialDeliveryRange={deliveryRangeParam}
          initialAttention={attentionParam}
          initialAttentionType={attentionTypeParam}
        />

        <p className={styles.textMuted}>
          Mostrando {startIndex}-{endIndex} de {totalCount}
        </p>

        {orders.length === 0 ? (
          <div className={styles.emptyState}>Nenhum pedido encontrado.</div>
        ) : (
          <OrdersTableClient
            columns={7}
            orders={orders.map(({ order, attention }) => {
              return {
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customer.name,
                customerPhone: order.customer.phone,
                deliveryMethodLabel: deliveryMethodLabel[order.deliveryMethod],
                status: order.status,
                statusLabel: statusLabel[order.status],
                incomplete: attention.reasons.some(
                  (reason) => reason.type === "INCOMPLETE"
                ),
                altered: attention.reasons.some(
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
                attention: attention.reasons.map((reason) => reason.label),
              };
            })}
          />
        )}
      </section>

      <div className={styles.clusterSm}>
        <Link href={pageLink(Math.max(1, clampedPage - 1))}>Anterior</Link>
        <span>
          Pagina {clampedPage} de {totalPages}
        </span>
        <Link href={pageLink(Math.min(totalPages, clampedPage + 1))}>
          Proxima
        </Link>
      </div>
    </main>
  );
}
