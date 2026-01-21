import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrderAttentionSummary, hasStrongAttention } from "@/lib/domain/attention";
import { verifySessionValue } from "@/lib/session";
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

  const [revenueAgg, productionCount, attentionOrders] = await Promise.all([
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
  ]);

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
            <Link href="/admin/pendencias">Ver pendencias</Link>
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
