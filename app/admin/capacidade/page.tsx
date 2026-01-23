import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getCapacityRows,
  normalizeCapacityWindow,
  type CapacityWindowKey,
} from "@/lib/domain/production";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./capacidade.module.css";

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

  // KPIs
  const productsWithGap = rows.filter((r) => r.gap > 0).length;
  const totalDemand = rows.reduce((sum, r) => sum + r.demand, 0);

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Capacidade</h1>
          <div className={layoutStyles.kpiBar}>
            <div className={layoutStyles.kpiItem}>
              <span className={layoutStyles.kpiValue}>{rows.length}</span>
              <span className={layoutStyles.kpiLabel}>produtos</span>
            </div>
            {productsWithGap > 0 && (
              <>
                <div className={layoutStyles.kpiDivider} />
                <div className={`${layoutStyles.kpiItem} ${layoutStyles.kpiWarning}`}>
                  <span className={layoutStyles.kpiValue}>{productsWithGap}</span>
                  <span className={layoutStyles.kpiLabel}>com gap</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className={layoutStyles.headerActions}>
          <Link href="/admin/producao" className={layoutStyles.linkButton}>
            Registrar produção
          </Link>
          <Link href="/admin/consumo" className={layoutStyles.linkButton}>
            Registrar consumo
          </Link>
        </div>
      </div>

      <section className={styles.panel}>
        <form method="get" className={layoutStyles.toolbar}>
          <div className={layoutStyles.toolbarFields}>
            <label className={layoutStyles.field}>
              <span className={layoutStyles.fieldLabel}>Janela</span>
              <select
                name="window"
                defaultValue={windowKey}
                className={layoutStyles.fieldControl}
              >
                {windowOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={layoutStyles.field}>
              <span className={layoutStyles.fieldLabel}>Produto</span>
              <input
                type="text"
                name="q"
                placeholder="Buscar produto"
                defaultValue={query}
                className={layoutStyles.fieldControl}
              />
            </label>
            <label className={layoutStyles.field}>
              <span className={layoutStyles.fieldLabel}>Filtro</span>
              <select name="gap" defaultValue={gapOnly ? "1" : "0"} className={layoutStyles.fieldControl}>
                <option value="0">Todos os produtos</option>
                <option value="1">Somente com gap</option>
              </select>
            </label>
          </div>
          <button type="submit" className={layoutStyles.filterButton}>
            Filtrar
          </button>
        </form>

        {rows.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIcon}>📊</div>
            <div className={layoutStyles.emptyStateTitle}>Nenhum produto encontrado</div>
            <div className={layoutStyles.emptyStateText}>
              Tente ajustar os filtros ou cadastre produtos.
            </div>
          </div>
        ) : (
          <div className={layoutStyles.tableContainer}>
            <table className={layoutStyles.capacityTable}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th className={layoutStyles.colNumeric}>Disponível</th>
                  <th className={layoutStyles.colNumeric}>Demanda</th>
                  <th className={layoutStyles.colNumeric}>Necessário produzir</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.productId}>
                    <td>
                      <span className={layoutStyles.productName}>{row.productName}</span>
                    </td>
                    <td>
                      <span className={layoutStyles.categoryName}>{row.categoryName}</span>
                    </td>
                    <td className={layoutStyles.colNumeric}>
                      <span className={layoutStyles.numericValue}>
                        {formatQty(row.available, row.unitLabel)}
                      </span>
                    </td>
                    <td className={layoutStyles.colNumeric}>
                      <span className={layoutStyles.numericValue}>
                        {formatQty(row.demand, row.unitLabel)}
                      </span>
                    </td>
                    <td className={layoutStyles.colNumeric}>
                      <span className={`${layoutStyles.gapValue} ${row.gap > 0 ? layoutStyles.gapPositive : layoutStyles.gapZero}`}>
                        {formatQty(row.gap, row.unitLabel)}
                      </span>
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
