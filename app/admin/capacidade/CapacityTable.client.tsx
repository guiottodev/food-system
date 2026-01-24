"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { CapacityRow } from "@/lib/domain/production";
import layoutStyles from "./capacidade.module.css";

export type SortKey = "productName" | "categoryName" | "available" | "demand" | "gap";
export type SortDir = "asc" | "desc";

function formatQty(value: number, unitLabel?: string | null) {
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

function SortIcon({
  sortKey,
  currentSort,
  currentDir,
  className,
}: {
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  className?: string;
}) {
  if (currentSort !== sortKey) {
    return <ArrowUpDown size={14} className={className} aria-hidden />;
  }
  return currentDir === "asc" ? (
    <ArrowUp size={14} className={className} aria-hidden />
  ) : (
    <ArrowDown size={14} className={className} aria-hidden />
  );
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

  function getNextSortDir(key: SortKey): SortDir {
    return sort === key && dir === "desc" ? "asc" : "desc";
  }

  function handleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", getNextSortDir(key));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className={layoutStyles.tableContainer}>
      <table className={layoutStyles.capacityTable}>
        <thead>
          <tr>
            <th
              className={layoutStyles.thSortable}
              onClick={() => handleSort("productName")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("productName");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={
                sort === "productName"
                  ? dir === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              Produto
              <span
                className={`${layoutStyles.thSortIcon} ${
                  sort === "productName" ? layoutStyles.thSortIconActive : ""
                }`}
              >
                <SortIcon
                  sortKey="productName"
                  currentSort={sort}
                  currentDir={dir}
                />
              </span>
            </th>
            <th
              className={layoutStyles.thSortable}
              onClick={() => handleSort("categoryName")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("categoryName");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={
                sort === "categoryName"
                  ? dir === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              Categoria
              <span
                className={`${layoutStyles.thSortIcon} ${
                  sort === "categoryName" ? layoutStyles.thSortIconActive : ""
                }`}
              >
                <SortIcon
                  sortKey="categoryName"
                  currentSort={sort}
                  currentDir={dir}
                />
              </span>
            </th>
            <th
              className={`${layoutStyles.colNumeric} ${layoutStyles.thSortable}`}
              onClick={() => handleSort("available")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("available");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={
                sort === "available"
                  ? dir === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              Disponível
              <span
                className={`${layoutStyles.thSortIcon} ${
                  sort === "available" ? layoutStyles.thSortIconActive : ""
                }`}
              >
                <SortIcon
                  sortKey="available"
                  currentSort={sort}
                  currentDir={dir}
                />
              </span>
            </th>
            <th
              className={`${layoutStyles.colNumeric} ${layoutStyles.thSortable}`}
              onClick={() => handleSort("demand")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("demand");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={
                sort === "demand"
                  ? dir === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              Demanda
              <span
                className={`${layoutStyles.thSortIcon} ${
                  sort === "demand" ? layoutStyles.thSortIconActive : ""
                }`}
              >
                <SortIcon
                  sortKey="demand"
                  currentSort={sort}
                  currentDir={dir}
                />
              </span>
            </th>
            <th
              className={`${layoutStyles.colNumeric} ${layoutStyles.thSortable}`}
              onClick={() => handleSort("gap")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSort("gap");
                }
              }}
              role="button"
              tabIndex={0}
              aria-sort={
                sort === "gap"
                  ? dir === "asc"
                    ? "ascending"
                    : "descending"
                  : undefined
              }
            >
              Necessário produzir
              <span
                className={`${layoutStyles.thSortIcon} ${
                  sort === "gap" ? layoutStyles.thSortIconActive : ""
                }`}
              >
                <SortIcon sortKey="gap" currentSort={sort} currentDir={dir} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.productId}
              className={i % 2 === 1 ? layoutStyles.rowAlt : undefined}
            >
              <td>
                <Link
                  href={`/admin/producao?productId=${encodeURIComponent(row.productId)}`}
                  className={layoutStyles.productName}
                  title="Registrar produção para este produto"
                >
                  {row.productName}
                </Link>
              </td>
              <td>
                <span className={layoutStyles.categoryName}>
                  {row.categoryName}
                </span>
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
                <span
                  className={`${layoutStyles.gapValue} ${
                    row.gap > 0 ? layoutStyles.gapPositive : layoutStyles.gapZero
                  }`}
                >
                  {formatQty(row.gap, row.unitLabel)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
