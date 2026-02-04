import { prisma } from "@/lib/prisma";
import {
  getCapacityRows,
  normalizeCapacityWindow,
  type CapacityWindowKey,
} from "@/lib/domain/production";
import type { CapacityRow } from "@/lib/domain/production";
import type { SortKey, SortDir } from "./CapacityTable.client";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./capacidade.module.css";
import ProductionFilters from "./ProductionFilters.client";
import CapacityTable from "./CapacityTable.client";
import ProductionEmptyState from "./ProductionEmptyState.client";
import Button from "../_components/Button";
import { InlineNotice } from "../design-system/InlineNotice.client";

type SearchParams = {
  q?: string;
  window?: string; // demanda (futuro)
  productionWindow?: string; // produção/consumo (passado) — default 15
  gap?: string;
  sort?: string;
  dir?: string;
  producao?: string;
  consumo?: string;
};

const SORT_KEYS: SortKey[] = [
  "productName",
  "categoryName",
  "produced",
  "consumed",
  "available",
  "demand",
  "gap",
];

function normalizeSort(v?: string): SortKey {
  if (v && SORT_KEYS.includes(v as SortKey)) return v as SortKey;
  return "gap";
}

function normalizeDir(v?: string): SortDir {
  return v === "asc" ? "asc" : "desc";
}

function sortRows(rows: CapacityRow[], sort: SortKey, dir: SortDir): CapacityRow[] {
  const asc = dir === "asc";
  const sign = asc ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "productName":
        cmp = a.productName.localeCompare(b.productName);
        break;
      case "categoryName":
        cmp = a.categoryName.localeCompare(b.categoryName);
        break;
      case "produced":
        cmp = a.produced - b.produced;
        break;
      case "consumed":
        cmp = a.consumed - b.consumed;
        break;
      case "available":
        cmp = a.available - b.available;
        break;
      case "demand":
        cmp = a.demand - b.demand;
        break;
      case "gap":
        cmp = a.gap - b.gap;
        break;
      default:
        cmp = a.gap - b.gap;
    }
    return sign * cmp;
  });
}

export default async function CapacidadePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const query = (sp?.q ?? "").trim();
  const windowKey = normalizeCapacityWindow(sp?.window);
  const productionWindowKey = sp?.productionWindow
    ? normalizeCapacityWindow(sp.productionWindow)
    : ("15" as CapacityWindowKey); // Default: últimos 15 dias
  const gapOnly = sp?.gap === "1";
  const sort = normalizeSort(sp?.sort);
  const dir = normalizeDir(sp?.dir);
  const producaoOk = sp?.producao === "1";
  const consumoOk = sp?.consumo === "1";

  const rows = await getCapacityRows(prisma, {
    window: windowKey,
    productionWindow: productionWindowKey,
    productQuery: query,
    gapOnly,
  });

  const sortedRows = sortRows(rows, sort, dir);

  const productsWithGap = rows.filter((r) => r.gap > 0).length;

  return (
    <main className={styles.page}>
      {producaoOk ? (
        <InlineNotice tone="success" clearQueryKeys={["producao"]}>
          Produção registrada com sucesso.
        </InlineNotice>
      ) : null}
      {consumoOk ? (
        <InlineNotice tone="success" clearQueryKeys={["consumo"]}>
          Consumo registrado com sucesso.
        </InlineNotice>
      ) : null}
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Produção</h1>
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
                  <span className={layoutStyles.kpiLabel}>precisam de produção</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className={layoutStyles.headerActions}>
          <Button variant="primary" href="/admin/producao">
            Registrar produção
          </Button>
          <Button variant="secondary" href="/admin/consumo">
            Registrar consumo
          </Button>
        </div>
      </div>

      <section className={styles.panel}>
        <ProductionFilters
          initialQuery={query}
          initialWindow={windowKey}
          initialProductionWindow={productionWindowKey}
          initialGapOnly={gapOnly}
        />

        {sortedRows.length === 0 ? (
          <ProductionEmptyState />
        ) : (
          <CapacityTable rows={sortedRows} sort={sort} dir={dir} />
        )}
      </section>
    </main>
  );
}
