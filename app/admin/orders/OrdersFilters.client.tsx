"use client";

import Link from "next/link";
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
  initialPeriod: string;
  initialQuery: string;
  initialStatus: string;
  initialSort: string;
  initialPageSize: number;
  initialDeliveryDate: string;
  initialDeliveryRange: string;
  initialDeliveryStart: string;
  initialDeliveryEnd: string;
  initialAttention: string;
  initialOrderType: string;
  initialDeliveryMethod: string;
};

type PeriodValue = "upcoming" | "today" | "range" | "history";
type SortValue = "delivery_asc" | "delivery_desc" | "created_desc";
type AttentionValue =
  | "all"
  | "with"
  | "INCOMPLETE"
  | "ALTERADO_APOS_CONFIRMACAO"
  | "MISSING_TIME"
  | "MISSING_ADDRESS"
  | "PRECISA_PRODUZIR";

type FiltersState = {
  period: PeriodValue;
  deliveryStart: string;
  deliveryEnd: string;
  status: string;
  attention: AttentionValue;
  orderType: "all" | "ENCOMENDA" | "PRONTA_ENTREGA";
  deliveryMethod: "all" | "ENTREGA" | "RETIRADA";
  sort: SortValue;
  pageSize: number;
};


const attentionOptions: Array<{ value: AttentionValue; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "with", label: "Com pendencias" },
  { value: "PRECISA_PRODUZIR", label: "Precisa produzir" },
  { value: "INCOMPLETE", label: "Pedido incompleto" },
  { value: "ALTERADO_APOS_CONFIRMACAO", label: "Alterado apos confirmacao" },
  { value: "MISSING_ADDRESS", label: "Endereco nao informado" },
  { value: "MISSING_TIME", label: "Horario a confirmar" },
];

const attentionSummaryLabels: Record<AttentionValue, string> = {
  all: "Todas",
  with: "Com pendencias",
  PRECISA_PRODUZIR: "Precisa produzir",
  INCOMPLETE: "Pedido incompleto",
  ALTERADO_APOS_CONFIRMACAO: "Alterado apos confirmacao",
  MISSING_ADDRESS: "Endereco nao informado",
  MISSING_TIME: "Horario a confirmar",
};

const orderTypeOptions = [
  { value: "all", label: "Todos" },
  { value: "ENCOMENDA", label: "Encomenda" },
  { value: "PRONTA_ENTREGA", label: "Pronta entrega" },
];

const deliveryMethodOptions = [
  { value: "all", label: "Todos" },
  { value: "ENTREGA", label: "Entrega" },
  { value: "RETIRADA", label: "Retirada" },
];

const sortOptions = [
  { value: "delivery_asc", label: "Data mais proxima" },
  { value: "delivery_desc", label: "Data mais distante" },
  { value: "created_desc", label: "Criado recentemente" },
];

const periodOptions = [
  { value: "upcoming", label: "Proximos pedidos" },
  { value: "today", label: "Hoje" },
  { value: "range", label: "Intervalo de datas" },
  { value: "history", label: "Historico (entregues)" },
];

function normalizeView(view?: string) {
  if (view === "all") return "all";
  if (view === "previous" || view === "anteriores") return "previous";
  return "upcoming";
}

function normalizePeriod(value?: string): PeriodValue {
  if (value === "today") return "today";
  if (value === "range") return "range";
  if (value === "history") return "history";
  return "upcoming";
}

function normalizeSort(value?: string): SortValue {
  if (value === "delivery_desc") return "delivery_desc";
  if (value === "created_desc") return "created_desc";
  return "delivery_asc";
}

function normalizeAttention(value?: string): AttentionValue {
  if (value === "with") return "with";
  if (attentionSummaryLabels[value as AttentionValue]) {
    return value as AttentionValue;
  }
  return "all";
}

function normalizeOrderType(value?: string) {
  if (value === "ENCOMENDA") return "ENCOMENDA";
  if (value === "PRONTA_ENTREGA") return "PRONTA_ENTREGA";
  return "all";
}

function normalizeDeliveryMethod(value?: string) {
  if (value === "ENTREGA") return "ENTREGA";
  if (value === "RETIRADA") return "RETIRADA";
  return "all";
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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


export default function OrdersFilters({
  statusOptions,
  pageSizes,
  initialView,
  initialPeriod,
  initialQuery,
  initialStatus,
  initialSort,
  initialPageSize,
  initialDeliveryDate,
  initialDeliveryRange,
  initialDeliveryStart,
  initialDeliveryEnd,
  initialAttention,
  initialOrderType,
  initialDeliveryMethod,
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
  const legacyView = normalizeView(viewParam);
  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentStatus = searchParams.get("status") ?? initialStatus;
  const currentSort = normalizeSort(searchParams.get("sort") ?? initialSort);
  const currentPageSize = (() => {
    const parsed = Number(searchParams.get("pageSize") ?? initialPageSize);
    return pageSizes.includes(parsed) ? parsed : initialPageSize;
  })();
  const attentionTypeParam = searchParams.get("attentionType");
  const currentAttention = normalizeAttention(
    searchParams.get("attention") ?? initialAttention ?? attentionTypeParam
  );
  const currentOrderType = normalizeOrderType(
    searchParams.get("orderType") ?? initialOrderType
  );
  const currentDeliveryMethod = normalizeDeliveryMethod(
    searchParams.get("deliveryMethod") ?? initialDeliveryMethod
  );

  const periodFromParams = searchParams.get("period");
  const periodParam = normalizePeriod(periodFromParams ?? initialPeriod);
  const deliveryStartParam = searchParams.get("deliveryStart") ?? initialDeliveryStart;
  const deliveryEndParam = searchParams.get("deliveryEnd") ?? initialDeliveryEnd;
  const legacyDeliveryDate =
    searchParams.get("deliveryDate") ?? initialDeliveryDate;
  const legacyDeliveryRange =
    searchParams.get("deliveryRange") ?? initialDeliveryRange;

  const resolvedPeriod = useMemo(() => {
    const hasNewPeriod =
      Boolean(periodFromParams) ||
      Boolean(deliveryStartParam) ||
      Boolean(deliveryEndParam);

    if (hasNewPeriod) {
      return {
        period: periodParam,
        deliveryStart: deliveryStartParam,
        deliveryEnd: deliveryEndParam,
      };
    }

    if (legacyDeliveryDate) {
      return {
        period: "range" as PeriodValue,
        deliveryStart: legacyDeliveryDate,
        deliveryEnd: legacyDeliveryDate,
      };
    }

    if (legacyDeliveryRange === "day") {
      return {
        period: "today" as PeriodValue,
        deliveryStart: "",
        deliveryEnd: "",
      };
    }

    if (legacyDeliveryRange === "week" || legacyDeliveryRange === "month") {
      const now = new Date();
      const startToday = startOfDay(now);
      const endToday = endOfDay(now);
      const daysToSunday = (7 - startToday.getDay()) % 7;
      const endWeek = endOfDay(addDays(startToday, daysToSunday));
      const startMonth = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return {
        period: "range" as PeriodValue,
        deliveryStart: formatDateInput(
          legacyDeliveryRange === "week" ? startToday : startMonth
        ),
        deliveryEnd: formatDateInput(
          legacyDeliveryRange === "week" ? endWeek : endToday
        ),
      };
    }

    if (legacyView === "previous") {
      const now = new Date();
      const startToday = startOfDay(now);
      const startPrevious = startOfDay(addDays(now, -30));
      const endYesterday = endOfDay(addDays(startToday, -1));
      return {
        period: "range" as PeriodValue,
        deliveryStart: formatDateInput(startPrevious),
        deliveryEnd: formatDateInput(endYesterday),
      };
    }

    if (legacyView === "all") {
      return {
        period: "range" as PeriodValue,
        deliveryStart: "",
        deliveryEnd: "",
      };
    }

    return {
      period: "upcoming" as PeriodValue,
      deliveryStart: "",
      deliveryEnd: "",
    };
  }, [
    deliveryEndParam,
    deliveryStartParam,
    legacyDeliveryDate,
    legacyDeliveryRange,
    legacyView,
    periodParam,
    periodFromParams,
  ]);

  const effectiveStatus =
    resolvedPeriod.period === "history" ? "ENTREGUE" : currentStatus;

  const currentFilters = useMemo<FiltersState>(
    () => ({
      period: resolvedPeriod.period,
      deliveryStart: resolvedPeriod.deliveryStart,
      deliveryEnd: resolvedPeriod.deliveryEnd,
      status: effectiveStatus,
      attention: currentAttention,
      orderType: currentOrderType,
      deliveryMethod: currentDeliveryMethod,
      sort: currentSort,
      pageSize: currentPageSize,
    }),
    [
      currentAttention,
      currentDeliveryMethod,
      currentOrderType,
      currentPageSize,
      currentSort,
      effectiveStatus,
      resolvedPeriod,
    ]
  );

  const [draftFilters, setDraftFilters] = useState<FiltersState>(currentFilters);

  const defaults = useMemo(
    () => ({
      period: "upcoming" as PeriodValue,
      status: "ALL",
      attention: "all" as AttentionValue,
      orderType: "all" as const,
      deliveryMethod: "all" as const,
      sort: "delivery_asc" as SortValue,
      pageSize: initialPageSize,
    }),
    [initialPageSize]
  );

  const hasActiveFilters =
    Boolean(currentQuery.trim()) ||
    currentFilters.period !== defaults.period ||
    currentFilters.status !== defaults.status ||
    currentFilters.attention !== defaults.attention ||
    currentFilters.orderType !== defaults.orderType ||
    currentFilters.deliveryMethod !== defaults.deliveryMethod ||
    currentFilters.sort !== defaults.sort ||
    currentFilters.pageSize !== defaults.pageSize;

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
    [pathname, router, searchParamsString, startTransition]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) {
      setDraftFilters(currentFilters);
    }
  }, [currentFilters, filtersOpen]);

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

  const handleApplyFilters = () => {
    const statusValue =
      draftFilters.period === "history" ? "ENTREGUE" : draftFilters.status;
    applyParams({
      period: draftFilters.period !== defaults.period ? draftFilters.period : "",
      deliveryStart:
        draftFilters.period === "range" ? draftFilters.deliveryStart : "",
      deliveryEnd: draftFilters.period === "range" ? draftFilters.deliveryEnd : "",
      status: statusValue !== defaults.status ? statusValue : "",
      attention:
        draftFilters.attention !== defaults.attention
          ? draftFilters.attention
          : "",
      orderType:
        draftFilters.orderType !== defaults.orderType ? draftFilters.orderType : "",
      deliveryMethod:
        draftFilters.deliveryMethod !== defaults.deliveryMethod
          ? draftFilters.deliveryMethod
          : "",
      sort: draftFilters.sort !== defaults.sort ? draftFilters.sort : "",
      pageSize:
        draftFilters.pageSize !== defaults.pageSize ? draftFilters.pageSize : "",
      view: "",
      deliveryDate: "",
      deliveryRange: "",
      dir: "",
      attentionType: "",
    });
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    applyParams({
      q: "",
      period: "",
      deliveryStart: "",
      deliveryEnd: "",
      status: "",
      attention: "",
      orderType: "",
      deliveryMethod: "",
      sort: "",
      pageSize: "",
      view: "",
      deliveryDate: "",
      deliveryRange: "",
      dir: "",
      attentionType: "",
    });
    setFiltersOpen(false);
  };

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
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
          {hasActiveFilters ? (
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.clearButton}`}
              onClick={handleClearFilters}
            >
              Limpar filtros
            </button>
          ) : null}
          <div className={layoutStyles.filtersWrap} ref={panelRef}>
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.filtersButton} ${
                filtersOpen || hasActiveFilters ? layoutStyles.filtersButtonActive : ""
              }`}
              onClick={() => {
                setDraftFilters(currentFilters);
                setFiltersOpen((open) => !open);
              }}
              aria-expanded={filtersOpen}
              aria-controls="orders-filters-panel"
            >
              Filtros
            </button>
            {filtersOpen ? (
              <div
                id="orders-filters-panel"
                className={layoutStyles.filtersPanel}
                role="dialog"
                aria-label="Filtros de pedidos"
              >
                <div className={layoutStyles.filtersGrid}>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.fieldLabel}>Periodo</span>
                    <div className={styles.fieldControl}>
                      <select
                        name="period"
                        value={draftFilters.period}
                        onChange={(event) => {
                          const value = normalizePeriod(event.target.value);
                          setDraftFilters((current) => ({
                            ...current,
                            period: value,
                            status: value === "history" ? "ENTREGUE" : current.status,
                          }));
                        }}
                        className={`${styles.control} ${layoutStyles.filterSelect}`}
                        aria-label="Periodo"
                        disabled={isPending}
                      >
                        {periodOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {draftFilters.period === "range" ? (
                        <div className={layoutStyles.rangeRow}>
                          <input
                            type="date"
                            name="deliveryStart"
                            value={draftFilters.deliveryStart}
                            onChange={(event) =>
                              setDraftFilters((current) => ({
                                ...current,
                                deliveryStart: event.target.value,
                              }))
                            }
                            className={`${styles.control} ${layoutStyles.dateInput}`}
                            aria-label="Data inicial"
                          />
                          <input
                            type="date"
                            name="deliveryEnd"
                            value={draftFilters.deliveryEnd}
                            onChange={(event) =>
                              setDraftFilters((current) => ({
                                ...current,
                                deliveryEnd: event.target.value,
                              }))
                            }
                            className={`${styles.control} ${layoutStyles.dateInput}`}
                            aria-label="Data final"
                          />
                        </div>
                      ) : null}
                    </div>
                    {draftFilters.period === "history" ? (
                      <span className={styles.fieldHelp}>
                        Historico exibe apenas pedidos entregues.
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Status do pedido</span>
                    <select
                      name="status"
                      value={draftFilters.status}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Status do pedido"
                      disabled={isPending || draftFilters.period === "history"}
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
                      value={draftFilters.attention}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          attention: normalizeAttention(event.target.value),
                        }))
                      }
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Pendencias"
                      disabled={isPending}
                    >
                      {attentionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Tipo de pedido</span>
                    <select
                      name="orderType"
                      value={draftFilters.orderType}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          orderType: normalizeOrderType(event.target.value),
                        }))
                      }
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Tipo de pedido"
                      disabled={isPending}
                    >
                      {orderTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Logistica</span>
                    <select
                      name="deliveryMethod"
                      value={draftFilters.deliveryMethod}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          deliveryMethod: normalizeDeliveryMethod(event.target.value),
                        }))
                      }
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Logistica"
                      disabled={isPending}
                    >
                      {deliveryMethodOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Ordenacao</span>
                    <select
                      name="sort"
                      value={draftFilters.sort}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          sort: normalizeSort(event.target.value),
                        }))
                      }
                      className={`${styles.control} ${layoutStyles.filterSelect}`}
                      aria-label="Ordenacao"
                      disabled={isPending}
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Itens por pagina</span>
                    <select
                      name="pageSize"
                      value={draftFilters.pageSize}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          pageSize: Number(event.target.value),
                        }))
                      }
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
                <div className={layoutStyles.filtersFooter}>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={handleApplyFilters}
                    disabled={isPending}
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <Link
            href="/admin/orders/new"
            className={`${styles.button} ${styles.buttonPrimary} ${layoutStyles.newOrderButton}`}
          >
            Novo pedido
          </Link>
        </div>
      </div>
    </div>
  );
}

