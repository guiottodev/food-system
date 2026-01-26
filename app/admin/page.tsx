import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary, hasStrongAttention } from "@/lib/domain/attention";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import {
  computeOrderStockStatus,
  computeUnavailableItemsForOrders,
} from "@/lib/domain/production";
import { verifySessionValue } from "@/lib/session";
import DashboardNextActions from "./DashboardNextActions.client";
import styles from "./_styles/adminPrimitives.module.css";

type SearchParams = {
  period?: string;
  start?: string;
  end?: string;
};

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

function formatDeliveryLabel(value?: Date | null, time?: string | null) {
  if (!value) return "-";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(value);
  const t = (time ?? "").trim();
  if (!t || t === DEFAULT_DELIVERY_TIME) return dateLabel;
  return `${dateLabel} ${t}`;
}

function parseDateParam(value?: string) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type Period = "today" | "next7" | "custom";

function normalizePeriod(value?: string): Period {
  if (value === "next7") return "next7";
  if (value === "custom") return "custom";
  return "today";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }

  const sp = await Promise.resolve(searchParams);
  const period = normalizePeriod(sp?.period);
  const today = new Date();
  const startToday = startOfDay(today);
  const endToday = endOfDay(today);
  const endNext15 = endOfDay(addDays(today, 15));

  let rangeStart = startToday;
  let rangeEnd = endToday;

  if (period === "next7") {
    rangeStart = startToday;
    rangeEnd = endOfDay(addDays(startToday, 7));
  } else if (period === "custom") {
    const parsedStart = parseDateParam(sp?.start);
    const parsedEnd = parseDateParam(sp?.end);
    rangeStart = parsedStart ? startOfDay(parsedStart) : startToday;
    rangeEnd = parsedEnd ? endOfDay(parsedEnd) : endToday;
    if (rangeStart.getTime() > rangeEnd.getTime()) {
      const temp = rangeStart;
      rangeStart = rangeEnd;
      rangeEnd = temp;
    }
  }

  const [revenueAgg, productionCount, attentionOrders, pendingListOrders] = await Promise.all([
    prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: "ENTREGUE",
        deliveryDatetime: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    }),
    prisma.order.count({
      where: {
        status: "EM_PRODUCAO",
      },
    }),
    prisma.order.findMany({
      where: {
        status: {
          notIn: ["ENTREGUE", "CANCELADO"],
        },
      },
      select: {
        id: true,
        status: true,
        deliveryDatetime: true,
        deliveryTime: true,
        deliveryMethod: true,
        orderType: true,
        addressText: true,
        addressCity: true,
        needsReconfirmation: true,
        paidAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { notIn: ["ENTREGUE", "CANCELADO"] },
        deliveryDatetime: { gte: startToday, lte: endNext15 },
      },
      orderBy: { deliveryDatetime: "asc" },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliveryDatetime: true,
        deliveryTime: true,
        deliveryMethod: true,
        orderType: true,
        addressText: true,
        addressCity: true,
        needsReconfirmation: true,
        paidAt: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        customer: { select: { name: true } },
        items: { select: { id: true, skuId: true, quantity: true } },
      },
    }),
  ]);

  const orderInputsForList = pendingListOrders.map((o) => ({
    id: o.id,
    status: o.status,
    items: o.items,
  }));

  const [availabilityMapList, stockStatusMapList] = await Promise.all([
    computeUnavailableItemsForOrders(prisma, orderInputsForList),
    computeOrderStockStatus(prisma, orderInputsForList),
  ]);

  const entriesForList = pendingListOrders.map((order) => {
    const hasUnavailableItems = availabilityMapList.get(order.id)?.hasUnavailableItems ?? false;
    const hasStockShortage = stockStatusMapList.get(order.id)?.deliveredShortage ?? false;
    const attention = getOrderAttentionSummary({ ...order, hasUnavailableItems, hasStockShortage });
    const stockStatus = stockStatusMapList.get(order.id) ?? {
      needsProduction: false,
      deliveredShortage: false,
    };
    return { order, attention, stockStatus };
  });

  const filteredList = entriesForList.filter(
    (e) => e.attention.hasAttention || e.stockStatus.needsProduction
  );

  const sortedList = [...filteredList].sort((a, b) => {
    const aStrong = a.attention.strongReasons.length > 0 ? 1 : 0;
    const bStrong = b.attention.strongReasons.length > 0 ? 1 : 0;
    if (bStrong !== aStrong) return bStrong - aStrong;
    const aDt = a.order.deliveryDatetime?.getTime() ?? Infinity;
    const bDt = b.order.deliveryDatetime?.getTime() ?? Infinity;
    return aDt - bDt;
  });

  const pendingList = sortedList.slice(0, 10).map(({ order, attention, stockStatus }) => {
    const labels = attention.reasons.map((r) => r.label);
    if (
      stockStatus.needsProduction &&
      !labels.some((l) => /produzir|saldo/i.test(l))
    ) {
      labels.push("Precisa produzir");
    }
    const tipo = labels.slice(0, 2).join(" • ") || "Pendência";
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customer?.name ?? "-",
      deliveryLabel: formatDeliveryLabel(order.deliveryDatetime, order.deliveryTime),
      tipo,
    };
  });

  const pendingStrongCount = attentionOrders.reduce((count, order) => {
    const summary = getOrderAttentionSummary(order);
    return count + (hasStrongAttention(summary) ? 1 : 0);
  }, 0);

  const revenueTotal = Number(revenueAgg._sum.total ?? 0);
  const startInput = formatDateInput(rangeStart);
  const endInput = formatDateInput(rangeEnd);

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Painel</h1>
      </div>

      <div className={styles.cardsGrid}>
        <section className={`${styles.panel} ${styles.panelPrimary}`}>
          <div className={styles.stackSm}>
            <h2>Receita</h2>
            <div className={styles.pageTitle}>{formatCurrency(revenueTotal)}</div>
            <form method="get" className={styles.clusterSm}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Periodo</span>
                <select
                  name="period"
                  defaultValue={period}
                  className={styles.control}
                >
                  <option value="today">Hoje</option>
                  <option value="next7">Proximos 7 dias</option>
                  <option value="custom">Periodo customizado</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Inicio</span>
                <input
                  type="date"
                  name="start"
                  defaultValue={startInput}
                  className={styles.control}
                  disabled={period !== "custom"}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Fim</span>
                <input
                  type="date"
                  name="end"
                  defaultValue={endInput}
                  className={styles.control}
                  disabled={period !== "custom"}
                />
              </label>
              <button type="submit" className={styles.button}>
                Aplicar
              </button>
            </form>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.stackSm}>
            <h2>Pendencias fortes</h2>
            <div className={styles.pageTitle}>{pendingStrongCount}</div>
            {pendingList.length > 0 ? (
              <>
                <DashboardNextActions
                  orders={sortedList.slice(0, 3).map(({ order, attention }) => ({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    attention,
                    customerName: order.customer?.name ?? "-",
                    itemsCount: order.items.length,
                    subtotal: Number(order.subtotal),
                    deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : null,
                    total: Number(order.total),
                    deliveryDatetime: order.deliveryDatetime,
                    deliveryTime: order.deliveryTime,
                    orderType: order.orderType,
                    deliveryMethod: order.deliveryMethod,
                    addressText: order.addressText,
                    addressCity: order.addressCity,
                    needsReconfirmation: order.needsReconfirmation,
                    hasPayment: Boolean(order.paidAt),
                  }))}
                />
                <Link href="/admin/orders?attention=with">Ver todos</Link>
              </>
            ) : (
              <p className={styles.textMuted}>Nenhum pedido com pendência nos próximos 15 dias.</p>
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.stackSm}>
            <h2>Pedidos em producao</h2>
            <div className={styles.pageTitle}>{productionCount}</div>
            <Link href="/admin/orders?status=EM_PRODUCAO">Ver pedidos</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
