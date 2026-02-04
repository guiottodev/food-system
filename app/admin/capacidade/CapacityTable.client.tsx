"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import DataTable from "../_components/DataTable";
import type { CapacityRow } from "@/lib/domain/production";
import layoutStyles from "./capacidade.module.css";

export type SortKey = "productName" | "categoryName" | "produced" | "consumed" | "available" | "demand" | "gap";
export type SortDir = "asc" | "desc";

function formatQty(value: number, unitLabel?: string | null) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

type CapacityTableProps = {
  rows: CapacityRow[];
  sort: SortKey;
  dir: SortDir;
};

export default function CapacityTable({ rows, sort, dir }: CapacityTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSort = (column: string, direction: "asc" | "desc") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", column);
    params.set("dir", direction);
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns = [
    {
      key: "productName",
      header: "Produto",
      accessor: (row: CapacityRow) => (
        <Link
          href={`/admin/producao?productId=${encodeURIComponent(row.productId)}`}
          className={layoutStyles.productName}
          title="Registrar produção para este produto"
          onClick={(e) => e.stopPropagation()}
        >
          {row.productName}
        </Link>
      ),
      sortable: true,
      visible: true,
      mobilePriority: "high" as const,
      truncation: "ellipsis" as const,
    },
    {
      key: "categoryName",
      header: "Categoria",
      accessor: (row: CapacityRow) => (
        <span className={layoutStyles.categoryName}>{row.categoryName}</span>
      ),
      sortable: true,
      visible: true,
      mobilePriority: "low" as const,
    },
    {
      key: "produced",
      header: "Produzido",
      accessor: (row: CapacityRow) => (
        <span className={layoutStyles.numericValue}>
          {formatQty(row.produced, row.unitLabel)}
        </span>
      ),
      align: "right" as const,
      sortable: true,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
    {
      key: "consumed",
      header: "Consumido",
      accessor: (row: CapacityRow) => (
        <span className={layoutStyles.numericValue}>
          {formatQty(row.consumed, row.unitLabel)}
        </span>
      ),
      align: "right" as const,
      sortable: true,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
    {
      key: "available",
      header: "Disponível",
      accessor: (row: CapacityRow) => (
        <span className={layoutStyles.numericValue}>
          {formatQty(row.available, row.unitLabel)}
        </span>
      ),
      align: "right" as const,
      sortable: true,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
    {
      key: "demand",
      header: "Demanda",
      accessor: (row: CapacityRow) => (
        <span className={layoutStyles.numericValue}>
          {formatQty(row.demand, row.unitLabel)}
        </span>
      ),
      align: "right" as const,
      sortable: true,
      visible: true,
      mobilePriority: "low" as const,
      numeric: true,
    },
    {
      key: "gap",
      header: "Necessário produzir",
      accessor: (row: CapacityRow) => (
        <span
          className={`${layoutStyles.gapValue} ${
            row.gap > 0 ? layoutStyles.gapPositive : layoutStyles.gapZero
          }`}
        >
          {formatQty(row.gap, row.unitLabel)}
        </span>
      ),
      align: "right" as const,
      sortable: true,
      visible: true,
      mobilePriority: "high" as const,
      numeric: true,
    },
  ];

  return (
    <div className={layoutStyles.tableWrapper}>
      <DataTable
        columns={columns}
        data={rows.map((row) => ({ ...row, id: row.productId }))}
        density="comfortable"
        stickyHeader={true}
        sortable={true}
        onSort={handleSort}
        sortColumn={sort}
        sortDirection={dir}
        tableId="capacity-table"
        expandRenderer={(row: CapacityRow) => {
          if (row.skus.length === 0) {
            return (
              <div className={layoutStyles.emptySkus}>
                Nenhum SKU cadastrado para este produto.
              </div>
            );
          }

          return (
            <div className={layoutStyles.skusList}>
              {row.skus.map((sku) => (
                <div key={sku.skuId} className={layoutStyles.skuRow}>
                  <div className={layoutStyles.skuHeader}>
                    <div className={layoutStyles.skuNameSection}>
                      <strong className={layoutStyles.skuName}>{sku.skuName}</strong>
                    </div>
                  </div>
                  <div className={layoutStyles.skuMeta}>
                    <div className={layoutStyles.skuMetaData}>
                      <div className={layoutStyles.skuMetaItem}>
                        <span className={layoutStyles.skuMetaLabel}>Estoque</span>
                        <span
                          className={`${layoutStyles.skuMetaValue} ${
                            sku.stockQuantity === 0 ? layoutStyles.stockZero : ""
                          }`}
                        >
                          {formatQty(sku.stockQuantity, sku.unitLabel)}
                        </span>
                      </div>
                      <span className={layoutStyles.skuMetaSep}>·</span>
                      <div className={layoutStyles.skuMetaItem}>
                        <span className={layoutStyles.skuMetaLabel}>Produzido</span>
                        <span className={layoutStyles.skuMetaValue}>
                          {formatQty(sku.produced, sku.unitLabel)}
                        </span>
                      </div>
                      <span className={layoutStyles.skuMetaSep}>·</span>
                      <div className={layoutStyles.skuMetaItem}>
                        <span className={layoutStyles.skuMetaLabel}>Consumido</span>
                        <span className={layoutStyles.skuMetaValue}>
                          {formatQty(sku.consumed, sku.unitLabel)}
                        </span>
                      </div>
                      <span className={layoutStyles.skuMetaSep}>·</span>
                      <div className={layoutStyles.skuMetaItem}>
                        <span className={layoutStyles.skuMetaLabel}>Disponível</span>
                        <span className={layoutStyles.skuMetaValue}>
                          {formatQty(sku.available, sku.unitLabel)}
                        </span>
                      </div>
                      <span className={layoutStyles.skuMetaSep}>·</span>
                      <div className={layoutStyles.skuMetaItem}>
                        <span className={layoutStyles.skuMetaLabel}>Demanda</span>
                        <span className={layoutStyles.skuMetaValue}>
                          {formatQty(sku.demand, sku.unitLabel)}
                        </span>
                      </div>
                      {sku.gap > 0 && (
                        <>
                          <span className={layoutStyles.skuMetaSep}>·</span>
                          <div className={layoutStyles.skuMetaItem}>
                            <span className={layoutStyles.skuMetaLabel}>Gap</span>
                            <span className={`${layoutStyles.gapValue} ${layoutStyles.gapPositive}`}>
                              {formatQty(sku.gap, sku.unitLabel)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}
