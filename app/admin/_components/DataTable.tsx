"use client";

"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, MoreVertical, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import styles from "./DataTable.module.css";

export interface ColumnDef<T> {
  key: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  visible?: boolean | ((density: "comfortable" | "compact") => boolean);
  /** Prioridade para mobile: "high" sempre visível, "low" colapsa no expand */
  mobilePriority?: "high" | "low";
  /** Classe CSS para truncation: "ellipsis" ou "line-clamp-2" ou "line-clamp-3" */
  truncation?: "ellipsis" | "line-clamp-2" | "line-clamp-3";
  /** Se true, usa tabular-nums para alinhamento numérico */
  numeric?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowAriaLabel?: (row: T) => string;
  expandRenderer?: (row: T) => React.ReactNode;
  actionsRenderer?: (row: T) => React.ReactNode;
  density?: "comfortable" | "compact";
  stickyHeader?: boolean;
  sortable?: boolean;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  tableId?: string;
  densityToggle?: React.ReactNode;
  /** Key que quando muda, reseta expanded rows. Útil para resetar expands ao mudar filtros/busca. */
  expandStateKey?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  rowHref,
  onRowClick,
  rowAriaLabel,
  expandRenderer,
  actionsRenderer,
  density = "comfortable",
  stickyHeader = true,
  sortable = true,
  onSort,
  sortColumn,
  sortDirection,
  tableId = "default",
  densityToggle,
  expandStateKey,
}: DataTableProps<T>) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Reset expanded rows quando expandStateKey muda (ex: ao mudar filtros/busca)
  useEffect(() => {
    if (expandStateKey !== undefined) {
      setExpandedRows(new Set());
    }
  }, [expandStateKey]);

  const handleRowClick = useCallback(
    (row: T, e?: React.MouseEvent) => {
      if (rowHref) {
        router.push(rowHref(row));
      } else if (onRowClick) {
        onRowClick(row);
      }
    },
    [rowHref, onRowClick, router]
  );

  const handleExpandClick = useCallback(
    (rowId: string, e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      setExpandedRows((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });
    },
    []
  );

  const handleSort = useCallback(
    (columnKey: string, e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (!onSort || !sortable) return;

      const currentDir = sortColumn === columnKey ? sortDirection : undefined;
      const newDir = currentDir === "asc" ? "desc" : "asc";
      onSort(columnKey, newDir);
    },
    [onSort, sortable, sortColumn, sortDirection]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, handler: () => void) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    },
    []
  );

  // Em mobile, mostrar apenas colunas de alta prioridade (ou todas se não especificado)
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const visibleColumns = columns.filter((col) => {
    if (col.visible === false) return false;
    if (typeof col.visible === "function") return col.visible(density);
    // Em mobile, mostrar apenas colunas de alta prioridade
    if (isMobile && col.mobilePriority === "low") return false;
    return true;
  });

  const hasExpand = !!expandRenderer;
  const hasActions = !!actionsRenderer;

  return (
    <div className={styles.tableContainer}>
      {densityToggle && (
        <div className={styles.densityToggleContainer}>
          {densityToggle}
        </div>
      )}
      <table
        className={`${styles.table} ${density === "compact" ? styles.tableCompact : ""}`}
        role="table"
        aria-label={`Tabela com ${data.length} ${data.length === 1 ? "item" : "itens"}`}
      >
        <thead className={stickyHeader ? styles.theadSticky : ""}>
          <tr>
            {hasExpand && (
              <th className={styles.thExpand} aria-label="Expandir linha">
                <span className={styles.thSortIcon} aria-hidden />
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column.key}
                className={`${styles.th} ${column.sortable && sortable ? styles.thSortable : ""} ${
                  column.align === "right" ? styles.thRight : column.align === "center" ? styles.thCenter : ""
                }`}
                style={{ width: column.width }}
                onClick={
                  column.sortable && sortable
                    ? (e) => handleSort(column.key, e)
                    : undefined
                }
                onKeyDown={
                  column.sortable && sortable
                    ? (e) => handleKeyDown(e, () => handleSort(column.key, e))
                    : undefined
                }
                role={column.sortable && sortable ? "button" : undefined}
                tabIndex={column.sortable && sortable ? 0 : undefined}
                aria-sort={
                  column.sortable && sortable && sortColumn === column.key
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {column.header}
                {column.sortable && sortable && (
                  <span
                    className={`${styles.thSortIcon} ${
                      sortColumn === column.key ? styles.thSortIconActive : ""
                    }`}
                    aria-hidden
                  >
                    {sortColumn === column.key ? (
                      sortDirection === "asc" ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : (
                      <ArrowUpDown size={14} />
                    )}
                  </span>
                )}
              </th>
            ))}
            {hasActions && (
              <th className={styles.thActions} aria-label="Ações">
                <span className={styles.thSortIcon} aria-hidden />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isExpanded = expandedRows.has(row.id);
            return (
              <React.Fragment key={row.id}>
                <tr
                  className={`${styles.tr} ${isExpanded ? styles.trExpanded : ""}`}
                  onClick={(e) => handleRowClick(row, e)}
                  onKeyDown={(e) => {
                    if (e.currentTarget !== e.target) return;
                    handleKeyDown(e, () => handleRowClick(row));
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={rowAriaLabel ? rowAriaLabel(row) : `Ver detalhes de ${row.id}`}
                >
                  {hasExpand && (
                    <td className={styles.tdExpand}>
                      <button
                        type="button"
                        className={styles.expandButton}
                        onClick={(e) => handleExpandClick(row.id, e)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleExpandClick(row.id, e))}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Recolher linha" : "Expandir linha"}
                      >
                        <ChevronRight
                          size={16}
                          className={`${styles.expandIcon} ${isExpanded ? styles.expandIconExpanded : ""}`}
                          aria-hidden
                        />
                      </button>
                    </td>
                  )}
                  {visibleColumns.map((column) => {
                    const truncationClass = column.truncation === "ellipsis" 
                      ? styles.textEllipsis 
                      : column.truncation === "line-clamp-2"
                      ? styles.textLineClamp2
                      : column.truncation === "line-clamp-3"
                      ? styles.textLineClamp3
                      : "";
                    const numericClass = column.numeric ? styles.tabularNums : "";
                    
                    return (
                      <td
                        key={column.key}
                        className={`${styles.td} ${
                          column.align === "right" ? styles.tdRight : column.align === "center" ? styles.tdCenter : ""
                        } ${truncationClass} ${numericClass}`}
                      >
                        {column.accessor ? column.accessor(row) : String((row as any)[column.key] ?? "")}
                      </td>
                    );
                  })}
                  {hasActions && (
                    <td className={styles.tdActions}>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                          }
                        }}
                      >
                        {actionsRenderer?.(row)}
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && expandRenderer && (
                  <tr className={styles.trExpandedContent}>
                    <td colSpan={visibleColumns.length + (hasExpand ? 1 : 0) + (hasActions ? 1 : 0)}>
                      <div className={styles.expandedContent}>{expandRenderer(row)}</div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
