import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getCapacityRows,
  normalizeCapacityWindow,
  type CapacityWindowKey,
} from "@/lib/domain/production";
import styles from "../_styles/adminPrimitives.module.css";

type SearchParams = {
  q?: string;
  window?: string;
  gap?: string;
};

function formatQty(value: number, unitLabel?: string | null) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

const windowOptions: Array<{ key: CapacityWindowKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "7", label: "7 dias" },
  { key: "14", label: "14 dias" },
  { key: "30", label: "30 dias" },
];

export default async function CapacidadePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const query = (sp?.q ?? "").trim();
  const windowKey = normalizeCapacityWindow(sp?.window);
  const gapOnly = sp?.gap === "1";

  const rows = await getCapacityRows(prisma, {
    window: windowKey,
    productQuery: query,
    gapOnly,
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Capacidade</h1>
        <div className={styles.clusterSm}>
          <Link
            href="/admin/producao"
            className={`${styles.button} ${styles.buttonGhost}`}
          >
            Ver producao
          </Link>
          <Link
            href="/admin/consumo"
            className={`${styles.button} ${styles.buttonGhost}`}
          >
            Registrar consumo
          </Link>
        </div>
      </div>

      <section className={styles.panel}>
        <form method="get" className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Janela</span>
              <select
                name="window"
                defaultValue={windowKey}
                className={styles.control}
              >
                {windowOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Produto</span>
              <input
                type="text"
                name="q"
                placeholder="Buscar produto"
                defaultValue={query}
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Gap</span>
              <select name="gap" defaultValue={gapOnly ? "1" : "0"} className={styles.control}>
                <option value="0">Todos</option>
                <option value="1">Somente com gap</option>
              </select>
            </label>
          </div>
          <div className={styles.toolbarActions}>
            <button type="submit" className={styles.button}>
              Filtrar
            </button>
          </div>
        </form>

        {rows.length === 0 ? (
          <div className={styles.emptyState}>Nenhum produto encontrado.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th className={styles.tableNumeric}>Disponivel agora</th>
                  <th className={styles.tableNumeric}>Demanda futura</th>
                  <th className={styles.tableNumeric}>Necessario produzir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.productName}</td>
                    <td>{row.categoryName}</td>
                    <td className={styles.tableNumeric}>
                      {formatQty(row.available, row.unitLabel)}
                    </td>
                    <td className={styles.tableNumeric}>
                      {formatQty(row.demand, row.unitLabel)}
                    </td>
                    <td className={styles.tableNumeric}>
                      {formatQty(row.gap, row.unitLabel)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
