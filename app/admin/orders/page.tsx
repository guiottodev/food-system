import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import OrdersTableClient from "./OrdersTableClient";
import styles from "../_styles/adminPrimitives.module.css";

type OrdersSearchParams = {
  view?: string;
  status?: string;
  q?: string;
  dir?: string;
  page?: string;
  pageSize?: string;
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const statusOptions = [
  { value: "ALL", label: "Todos" },
  { value: OrderStatus.NOVO, label: "Novo" },
  { value: OrderStatus.EM_PRODUCAO, label: "Em producao" },
  { value: OrderStatus.PRONTO, label: "Pronto" },
  { value: OrderStatus.ENTREGUE, label: "Entregue" },
  { value: OrderStatus.CANCELADO, label: "Cancelado" },
];

const statusLabel: Record<OrderStatus, string> = {
  NOVO: "Novo",
  EM_PRODUCAO: "Em producao",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
};

const deliveryMethodLabel = {
  ENTREGA: "Entrega",
  RETIRADA: "Retirada",
};

function normalizeView(view?: string) {
  if (view === "week") return "week";
  if (view === "all") return "all";
  if (view === "previous" || view === "anteriores") return "previous";
  return "day";
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

  const now = new Date();
  const startToday = startOfDay(now);
  const endToday = endOfDay(now);
  const endYesterday = endOfDay(addDays(now, -1));
  const startPrevious = startOfDay(addDays(now, -30));
  const endWeek = endOfDay(addDays(now, 6));

  // Ranges baseadas em data local (inicio/fim do dia) para inclusao correta.
  let dateFilter: { gte?: Date; lte?: Date } = {};
  if (view === "day") {
    dateFilter = { gte: startToday, lte: endToday };
  }
  if (view === "week") {
    dateFilter = { gte: startToday, lte: endWeek };
  }
  if (view === "all") {
    dateFilter = { gte: startToday };
  }
  if (view === "previous") {
    dateFilter = { gte: startPrevious, lte: endYesterday };
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

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: {
        deliveryDatetime: dir,
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
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
    }),
    prisma.order.count({ where }),
  ]);

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
  };

  const tabLink = (tab: string) =>
    withQuery("/admin/orders", { ...baseParams, view: tab, page: 1 });

  const pageLink = (nextPage: number) =>
    withQuery("/admin/orders", { ...baseParams, view, page: nextPage });

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pedidos</h1>
      </div>

      <div className={styles.pageSubnav}>
        <Link className={styles.pageSubnavLink} href={tabLink("day")}>
          Hoje
        </Link>
        <Link className={styles.pageSubnavLink} href={tabLink("week")}>
          Semana
        </Link>
        <Link className={styles.pageSubnavLink} href={tabLink("all")}>
          Todos
        </Link>
        <Link className={styles.pageSubnavLink} href={tabLink("previous")}>
          Anteriores
        </Link>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Filtros</h2>
        </div>
        <div className={styles.panelBody}>
          <form className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
              <input
                type="text"
                name="q"
                placeholder="Buscar por cliente ou telefone"
                defaultValue={query}
                className={styles.control}
              />
              <select
                name="status"
                defaultValue={statusParam}
                className={styles.control}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select name="dir" defaultValue={dir} className={styles.control}>
                <option value="asc">Entrega: mais cedo</option>
                <option value="desc">Entrega: mais tarde</option>
              </select>
              <select
                name="pageSize"
                defaultValue={pageSize}
                className={styles.control}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} por pagina
                  </option>
                ))}
              </select>
              <input type="hidden" name="view" value={view} />
            </div>
            <div className={styles.toolbarActions}>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>
      </section>

      <p>
        Mostrando {startIndex}-{endIndex} de {totalCount}
      </p>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Lista</h2>
        </div>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>Nenhum pedido encontrado.</div>
        ) : (
          <OrdersTableClient
            columns={7}
            orders={orders.map((order) => ({
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customer.name,
              customerPhone: order.customer.phone,
              deliveryMethodLabel: deliveryMethodLabel[order.deliveryMethod],
              status: order.status,
              statusLabel: statusLabel[order.status],
              deliveryDatetime: formatDateTime(order.deliveryDatetime),
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
            }))}
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










