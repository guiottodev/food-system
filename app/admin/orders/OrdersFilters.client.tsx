"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./orders.module.css";

type StatusOption = {
  value: string;
  label: string;
};

type OrdersFiltersProps = {
  statusOptions: StatusOption[];
  pageSizes: number[];
  initialView: string;
  initialQuery: string;
  initialStatus: string;
  initialDir: string;
  initialPageSize: number;
  initialDeliveryDate: string;
  initialDeliveryRange: string;
  initialAttention: string;
  initialAttentionType: string;
};

type ViewValue = "upcoming" | "all" | "previous";

function normalizeView(view?: string): ViewValue {
  if (view === "all") return "all";
  if (view === "previous" || view === "anteriores") return "previous";
  return "upcoming";
}

function formatDateLabel(value: string) {
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function OrdersFilters({
  statusOptions,
  pageSizes,
  initialView,
  initialQuery,
  initialStatus,
  initialDir,
  initialPageSize,
  initialDeliveryDate,
  initialDeliveryRange,
  initialAttention,
  initialAttentionType,
}: OrdersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const viewParam = searchParams.get("view") ?? initialView;
  const currentView = normalizeView(viewParam);
  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentStatus = searchParams.get("status") ?? initialStatus;
  const currentDir = searchParams.get("dir") ?? initialDir;
  const currentPageSize =
    Number(searchParams.get("pageSize") ?? initialPageSize) || initialPageSize;

  const legacyRange = viewParam === "week" ? "week" : viewParam === "day" ? "day" : "";
  const currentDeliveryDate =
    searchParams.get("deliveryDate") ?? initialDeliveryDate;
  const currentDeliveryRange =
    searchParams.get("deliveryRange") ?? initialDeliveryRange ?? legacyRange;
  const currentAttention =
    searchParams.get("attention") ?? initialAttention ?? "all";
  const currentAttentionType =
    searchParams.get("attentionType") ?? initialAttentionType ?? "all";

  const todayLabel = useMemo(() => formatDateInput(new Date()), []);

  const applyParams = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParamsString);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      if (!("page" in updates)) {
        params.delete("page");
      }
      const next = params.toString();
      startTransition(() => {
        router.push(next ? `${pathname}?${next}` : pathname);
      });
    },
    [pathname, router, searchParamsString, startTransition],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const dateChip = currentDeliveryDate
    ? {
        label: `Entrega: ${formatDateLabel(currentDeliveryDate)}`,
        onRemove: () =>
          applyParams({ deliveryDate: "", deliveryRange: "", view: "upcoming" }),
      }
    : currentDeliveryRange === "week"
    ? {
        label: "Entrega: esta semana",
        onRemove: () =>
          applyParams({ deliveryRange: "", deliveryDate: "", view: "upcoming" }),
      }
    : currentDeliveryRange === "month"
    ? {
        label: "Entrega: este mes",
        onRemove: () =>
          applyParams({ deliveryRange: "", deliveryDate: "", view: "upcoming" }),
      }
    : currentDeliveryRange === "day"
    ? {
        label: "Entrega: hoje",
        onRemove: () =>
          applyParams({ deliveryRange: "", deliveryDate: "", view: "upcoming" }),
      }
    : null;

  const hasActiveFilters =
    currentStatus !== "ALL" ||
    currentAttention !== "all" ||
    currentAttentionType !== "all" ||
    currentDir !== "asc" ||
    currentPageSize !== initialPageSize;

  useEffect(() => {
    if (!filtersOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filtersOpen]);

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
          <div className={`${styles.segmented} ${layoutStyles.segmented}`}>
            {[
              { value: "upcoming", label: "Proximas entregas" },
              { value: "all", label: "Todos" },
              { value: "previous", label: "Anteriores" },
            ].map((option) => (
              <label
                key={option.value}
                className={`${styles.segmentedOption} ${
                  currentView === option.value ? styles.segmentedActive : ""
                }`}
              >
                <input
                  type="radio"
                  name="view"
                  value={option.value}
                  checked={currentView === option.value}
                  onChange={() =>
                    applyParams({
                      view: option.value,
                      deliveryDate: "",
                      deliveryRange: "",
                    })
                  }
                />
                <span className={styles.segmentedTitle}>{option.label}</span>
              </label>
            ))}
          </div>
          <div className={layoutStyles.searchWrap}>
            <input
              type="text"
              name="q"
              placeholder="Buscar por cliente ou telefone"
              defaultValue={currentQuery}
              key={currentQuery}
              onChange={(event) => {
                const value = event.target.value;
                if (debounceRef.current) {
                  window.clearTimeout(debounceRef.current);
                }
                debounceRef.current = window.setTimeout(() => {
                  applyParams({ q: value.trim() });
                }, 250);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyParams({ q: (event.currentTarget.value || "").trim() });
                }
              }}
              aria-label="Buscar por cliente ou telefone"
              className={`${styles.control} ${layoutStyles.searchInput}`}
            />
          </div>
          <div className={layoutStyles.dateGroup}>
            <input
              type="date"
              name="deliveryDate"
              defaultValue={currentDeliveryDate || ""}
              key={currentDeliveryDate}
              aria-label="Entrega em"
              className={`${styles.control} ${layoutStyles.dateInput}`}
              onChange={(event) =>
                applyParams({
                  deliveryDate: event.target.value,
                  deliveryRange: "",
                  view: "upcoming",
                })
              }
            />
            <div className={layoutStyles.presets}>
              <button
                type="button"
                className={`${styles.button} ${layoutStyles.presetButton} ${
                  currentDeliveryDate === todayLabel ? layoutStyles.presetButtonActive : ""
                }`}
                onClick={() =>
                  applyParams({
                    deliveryDate: todayLabel,
                    deliveryRange: "",
                    view: "upcoming",
                  })
                }
              >
                Hoje
              </button>
              <button
                type="button"
                className={`${styles.button} ${layoutStyles.presetButton} ${
                  currentDeliveryRange === "week" ? layoutStyles.presetButtonActive : ""
                }`}
                onClick={() =>
                  applyParams({
                    deliveryRange: "week",
                    deliveryDate: "",
                    view: "upcoming",
                  })
                }
              >
                Esta semana
              </button>
              <button
                type="button"
                className={`${styles.button} ${layoutStyles.presetButton} ${
                  currentDeliveryRange === "month" ? layoutStyles.presetButtonActive : ""
                }`}
                onClick={() =>
                  applyParams({
                    deliveryRange: "month",
                    deliveryDate: "",
                    view: "upcoming",
                  })
                }
              >
                Este mes
              </button>
              <button
                type="button"
                className={`${styles.button} ${layoutStyles.presetButton}`}
                onClick={() =>
                  applyParams({
                    deliveryRange: "",
                    deliveryDate: "",
                    view: "upcoming",
                  })
                }
              >
                Limpar
              </button>
            </div>
          </div>
          <div className={layoutStyles.filtersWrap} ref={panelRef}>
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.filtersButton} ${
                filtersOpen || hasActiveFilters ? layoutStyles.filtersButtonActive : ""
              }`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="orders-filters-panel"
            >
              Filtros <span aria-hidden="true">v</span>
            </button>
            {filtersOpen ? (
              <div
                id="orders-filters-panel"
                className={layoutStyles.filtersPanel}
                role="dialog"
                aria-label="Filtros de pedidos"
              >
                <div className={layoutStyles.filtersGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <select
                      name="status"
                      value={currentStatus}
                      onChange={(event) => applyParams({ status: event.target.value })}
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Status do pedido"
                      disabled={isPending}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Pendencias</span>
                    <select
                      name="attention"
                      value={currentAttention}
                      onChange={(event) => applyParams({ attention: event.target.value })}
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Pendencias"
                      disabled={isPending}
                    >
                      <option value="all">Pendencias: todas</option>
                      <option value="with">Com pendencias</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Tipo</span>
                    <select
                      name="attentionType"
                      value={currentAttentionType}
                      onChange={(event) =>
                        applyParams({ attentionType: event.target.value })
                      }
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Tipo de pendencia"
                      disabled={isPending}
                    >
                      <option value="all">Tipo: todos</option>
                      <option value="INCOMPLETE">Incompleto</option>
                      <option value="ALTERADO_APOS_CONFIRMACAO">Alterado</option>
                      <option value="MISSING_TIME">Sem horario</option>
                      <option value="MISSING_ADDRESS">Sem endereco</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Entrega</span>
                    <select
                      name="dir"
                      value={currentDir}
                      onChange={(event) => applyParams({ dir: event.target.value })}
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Ordenacao por entrega"
                      disabled={isPending}
                    >
                      <option value="asc">Entrega: mais cedo</option>
                      <option value="desc">Entrega: mais tarde</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Pagina</span>
                    <select
                      name="pageSize"
                      value={currentPageSize}
                      onChange={(event) => applyParams({ pageSize: event.target.value })}
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Itens por pagina"
                      disabled={isPending}
                    >
                      {pageSizes.map((size) => (
                        <option key={size} value={size}>
                          {size} por pagina
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {dateChip ? (
        <div className={layoutStyles.chipsRow}>
          <span className={layoutStyles.chip}>
            {dateChip.label}
            <button
              type="button"
              onClick={dateChip.onRemove}
              className={layoutStyles.chipButton}
              aria-label={`Remover filtro ${dateChip.label}`}
            >
              x
            </button>
          </span>
        </div>
      ) : null}
    </div>
  );
}
