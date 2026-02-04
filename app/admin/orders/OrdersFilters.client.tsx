"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Calendar, Package, ArrowUpDown, AlertCircle } from "lucide-react";
import FiltersPanel from "../_components/FiltersPanel.client";
import FilterSelect from "./FilterSelect.client";
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
  initialMode: string;
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

type ModeValue = "agenda" | "historico";
type PeriodValue =
  | "upcoming"
  | "today"
  | "next7"
  | "next30"
  | "range"
  | "last7"
  | "last30";
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

const agendaPeriodOptions = [
  { value: "upcoming", label: "Proximos pedidos" },
  { value: "today", label: "Hoje" },
  { value: "next7", label: "Proximos 7 dias" },
  { value: "next30", label: "Proximos 30 dias" },
  { value: "range", label: "Intervalo de datas" },
];

const historyPeriodOptions = [
  { value: "last7", label: "Ultimos 7 dias" },
  { value: "last30", label: "Ultimos 30 dias" },
  { value: "range", label: "Intervalo de datas" },
];

function normalizeView(view?: string) {
  if (view === "all") return "all";
  if (view === "previous" || view === "anteriores") return "previous";
  return "upcoming";
}

function normalizeMode(value?: string): ModeValue {
  if (value === "historico" || value === "history") return "historico";
  return "agenda";
}

function normalizePeriod(value?: string): PeriodValue {
  if (value === "upcoming") return "upcoming";
  if (value === "today") return "today";
  if (value === "next7") return "next7";
  if (value === "next30") return "next30";
  if (value === "last7") return "last7";
  if (value === "last30") return "last30";
  if (value === "range") return "range";
  if (value === "history") return "last30";
  return "upcoming";
}

function normalizeSort(value: string | undefined, fallback: SortValue): SortValue {
  if (value === "delivery_desc") return "delivery_desc";
  if (value === "created_desc") return "created_desc";
  if (value === "delivery_asc") return "delivery_asc";
  return fallback;
}

function normalizeAttention(value?: string): AttentionValue {
  if (value === "with") return "with";
  if (attentionOptions.some((opt) => opt.value === value)) {
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
  initialMode,
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
  const debounceRef = useRef<number | null>(null);

  const modeParam = searchParams.get("mode") ?? initialMode;
  const currentMode = normalizeMode(modeParam);
  const viewParam = searchParams.get("view") ?? initialView;
  const legacyView = normalizeView(viewParam);
  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentStatus = searchParams.get("status") ?? initialStatus;
  const defaultSort =
    currentMode === "historico" ? "delivery_desc" : "delivery_asc";
  const defaultPeriod = currentMode === "historico" ? "last30" : "upcoming";
  const currentSort = normalizeSort(
    searchParams.get("sort") ?? initialSort,
    defaultSort
  );
  const currentPageSize = (() => {
    const parsed = Number(searchParams.get("pageSize") ?? initialPageSize);
    return pageSizes.includes(parsed) ? parsed : initialPageSize;
  })();
  const attentionTypeParam = searchParams.get("attentionType");
  const currentAttention =
    currentMode === "historico"
      ? ("all" as AttentionValue)
      : normalizeAttention(
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
    const hasExplicitPeriod =
      Boolean(periodFromParams) ||
      Boolean(deliveryStartParam) ||
      Boolean(deliveryEndParam);
    const allowedPeriods =
      currentMode === "historico"
        ? new Set<PeriodValue>(["last7", "last30", "range"])
        : new Set<PeriodValue>(["upcoming", "today", "next7", "next30", "range"]);

    if (hasExplicitPeriod) {
      const normalized = allowedPeriods.has(periodParam) ? periodParam : defaultPeriod;
      return {
        period: normalized,
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
        period: defaultPeriod,
        deliveryStart: "",
        deliveryEnd: "",
      };
    }

    return {
      period: defaultPeriod,
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
    currentMode,
    periodFromParams,
  ]);

  const historyStatusOptions = new Set(["ALL", "ENTREGUE", "CANCELADO"]);
  const normalizedHistoryStatus = historyStatusOptions.has(currentStatus)
    ? currentStatus
    : "ALL";
  const effectiveStatus =
    currentMode === "historico" ? normalizedHistoryStatus : "ALL";

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
      period: defaultPeriod as PeriodValue,
      status: "ALL",
      attention: "all" as AttentionValue,
      orderType: "all" as const,
      deliveryMethod: "all" as const,
      sort: defaultSort as SortValue,
      pageSize: initialPageSize,
    }),
    [defaultPeriod, defaultSort, initialPageSize]
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
      if (!("mode" in updates)) {
        params.set("mode", currentMode);
      }
      if (!("page" in updates)) {
        params.delete("page");
      }
      const next = params.toString();
      startTransition(() => {
        router.push(next ? `${pathname}?${next}` : pathname);
      });
    },
    [currentMode, pathname, router, searchParamsString, startTransition]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const syncDrafts = useCallback(() => {
    setDraftFilters(currentFilters);
  }, [currentFilters]);

  const handleApplyFilters = () => {
    const statusValue =
      currentMode === "historico" ? draftFilters.status : "ALL";
    const attentionValue =
      currentMode === "agenda" ? draftFilters.attention : "all";
    applyParams({
      period: draftFilters.period !== defaults.period ? draftFilters.period : "",
      deliveryStart:
        draftFilters.period === "range" ? draftFilters.deliveryStart : "",
      deliveryEnd: draftFilters.period === "range" ? draftFilters.deliveryEnd : "",
      status: statusValue !== defaults.status ? statusValue : "",
      attention:
        attentionValue !== defaults.attention ? attentionValue : "",
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

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentFilters.period !== defaults.period) count++;
    if (currentFilters.status !== defaults.status) count++;
    if (currentFilters.attention !== defaults.attention) count++;
    if (currentFilters.orderType !== defaults.orderType) count++;
    if (currentFilters.deliveryMethod !== defaults.deliveryMethod) count++;
    if (currentFilters.sort !== defaults.sort) count++;
    return count;
  }, [currentFilters, defaults]);

  const handleModeChange = (nextMode: ModeValue) => {
    if (nextMode === currentMode) return;
    applyParams({
      mode: nextMode,
      period: "",
      deliveryStart: "",
      deliveryEnd: "",
      status: "",
      attention: "",
      sort: "",
      page: "",
      view: "",
      deliveryDate: "",
      deliveryRange: "",
      dir: "",
      attentionType: "",
    });
    setFiltersOpen(false);
  };

  const periodOptions =
    currentMode === "historico" ? historyPeriodOptions : agendaPeriodOptions;
  const filteredStatusOptions =
    currentMode === "historico"
      ? statusOptions.filter((option) =>
          ["ALL", "ENTREGUE", "CANCELADO"].includes(option.value)
        )
      : [];
  const statusGroupLabel = currentMode === "historico" ? "Status" : "Pendências";

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
          <div className={layoutStyles.modeToggle} role="tablist" aria-label="Modo de pedidos">
            <button
              type="button"
              role="tab"
              aria-selected={currentMode === "agenda"}
              className={`${layoutStyles.modeButton} ${
                currentMode === "agenda" ? layoutStyles.modeButtonActive : ""
              }`}
              onClick={() => handleModeChange("agenda")}
            >
              Agenda
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={currentMode === "historico"}
              className={`${layoutStyles.modeButton} ${
                currentMode === "historico" ? layoutStyles.modeButtonActive : ""
              }`}
              onClick={() => handleModeChange("historico")}
            >
              Histórico
            </button>
          </div>
          <div className={layoutStyles.searchWrap}>
            <Search size={18} className={layoutStyles.searchIcon} aria-hidden />
            <input
              type="text"
              name="q"
              placeholder="Buscar por cliente, telefone ou codigo"
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
              aria-label="Buscar por cliente, telefone ou codigo"
              className={`${styles.control} ${layoutStyles.searchInput}`}
            />
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.clearButton}`}
              onClick={handleClearFilters}
            >
              Limpar
            </button>
          ) : null}
          <div className={layoutStyles.filtersWrap}>
            <FiltersPanel
              activeCount={activeFilterCount}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              isOpen={filtersOpen}
              onClose={() => {
                setFiltersOpen(false);
                syncDrafts();
              }}
              onToggle={() =>
                setFiltersOpen((open) => {
                  const next = !open;
                  if (next) syncDrafts();
                  return next;
                })
              }
            >
              {/* Grupo: Período */}
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Calendar size={16} aria-hidden />
                  <span>Período</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Período</span>
                    <FilterSelect
                      options={periodOptions}
                      value={draftFilters.period}
                      onChange={(value) => {
                        const normalized = normalizePeriod(value);
                        setDraftFilters((current) => ({
                          ...current,
                          period: normalized,
                        }));
                      }}
                      disabled={isPending}
                      aria-label="Periodo"
                    />
                  </div>
                  {draftFilters.period === "range" && (
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
                        className={layoutStyles.filterInputStyled}
                        aria-label="Data inicial"
                      />
                      <span className={layoutStyles.rangeSeparator}>até</span>
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
                        className={layoutStyles.filterInputStyled}
                        aria-label="Data final"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={layoutStyles.filtersDivider} />

              {/* Grupo: Status e Pendências */}
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <AlertCircle size={16} aria-hidden />
                  <span>{statusGroupLabel}</span>
                </div>
                <div className={layoutStyles.filtersRow}>
                  {currentMode === "historico" && (
                    <div className={layoutStyles.filterField}>
                      <span className={layoutStyles.filterFieldLabel}>Status</span>
                      <FilterSelect
                        options={filteredStatusOptions}
                        value={draftFilters.status}
                        onChange={(value) =>
                          setDraftFilters((current) => ({
                            ...current,
                            status: value,
                          }))
                        }
                        disabled={isPending}
                        aria-label="Status do pedido"
                      />
                    </div>
                  )}
                  {currentMode === "agenda" && (
                    <div className={layoutStyles.filterField}>
                      <span className={layoutStyles.filterFieldLabel}>Pendências</span>
                      <FilterSelect
                        options={attentionOptions}
                        value={draftFilters.attention}
                        onChange={(value) =>
                          setDraftFilters((current) => ({
                            ...current,
                            attention: normalizeAttention(value),
                          }))
                        }
                        disabled={isPending}
                        aria-label="Pendencias"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={layoutStyles.filtersDivider} />

              {/* Grupo: Tipo e Logística */}
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Package size={16} aria-hidden />
                  <span>Tipo e Logística</span>
                </div>
                <div className={layoutStyles.filtersRow}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Tipo</span>
                    <FilterSelect
                      options={orderTypeOptions}
                      value={draftFilters.orderType}
                      onChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          orderType: normalizeOrderType(value),
                        }))
                      }
                      disabled={isPending}
                      aria-label="Tipo de pedido"
                    />
                  </div>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Logística</span>
                    <FilterSelect
                      options={deliveryMethodOptions}
                      value={draftFilters.deliveryMethod}
                      onChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          deliveryMethod: normalizeDeliveryMethod(value),
                        }))
                      }
                      disabled={isPending}
                      aria-label="Logistica"
                    />
                  </div>
                </div>
              </div>

              <div className={layoutStyles.filtersDivider} />

              {/* Grupo: Ordenação */}
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <ArrowUpDown size={16} aria-hidden />
                  <span>Ordenação</span>
                </div>
                <div className={layoutStyles.filtersRow}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Ordenar por</span>
                    <FilterSelect
                      options={sortOptions}
                      value={draftFilters.sort}
                      onChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          sort: normalizeSort(value, defaultSort),
                        }))
                      }
                      disabled={isPending}
                      aria-label="Ordenacao"
                    />
                  </div>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Itens/página</span>
                    <FilterSelect
                      options={pageSizes.map((size) => ({
                        value: String(size),
                        label: `${size} itens`,
                      }))}
                      value={String(draftFilters.pageSize)}
                      onChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          pageSize: Number(value),
                        }))
                      }
                      disabled={isPending}
                      aria-label="Itens por pagina"
                    />
                  </div>
                </div>
              </div>
            </FiltersPanel>
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
