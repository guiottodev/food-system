"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, ListFilter } from "lucide-react";
import {
  normalizeCapacityWindow,
  type CapacityWindowKey,
} from "@/lib/domain/production";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./capacidade.module.css";
import FilterSelect from "../orders/FilterSelect.client";

const windowOptions: Array<{ value: CapacityWindowKey; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7", label: "Próximos 7 dias" },
  { value: "14", label: "Próximos 14 dias" },
  { value: "30", label: "Próximos 30 dias" },
];

const displayOptions = [
  { value: "0", label: "Todos os produtos" },
  { value: "1", label: "Somente os que precisam de produção" },
];

type ProductionFiltersProps = {
  initialQuery: string;
  initialWindow: CapacityWindowKey;
  initialGapOnly: boolean;
};

export default function ProductionFilters({
  initialQuery,
  initialWindow,
  initialGapOnly,
}: ProductionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentWindow = normalizeCapacityWindow(searchParams.get("window") ?? initialWindow);
  const currentGap = searchParams.get("gap") ?? (initialGapOnly ? "1" : "0");

  const [draftWindow, setDraftWindow] = useState<CapacityWindowKey>(currentWindow);
  const [draftGap, setDraftGap] = useState(currentGap);

  const hasActiveFilters =
    Boolean(currentQuery.trim()) ||
    currentWindow !== "7" ||
    currentGap !== "0";

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentQuery.trim()) count++;
    if (currentWindow !== "7") count++;
    if (currentGap !== "0") count++;
    return count;
  }, [currentQuery, currentWindow, currentGap]);

  const applyParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsString);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      const next = params.toString();
      startTransition(() => {
        router.push(next ? `${pathname}?${next}` : pathname);
      });
    },
    [pathname, router, searchParamsString, startTransition]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) {
      setDraftWindow(currentWindow);
      setDraftGap(currentGap);
    }
  }, [filtersOpen, currentWindow, currentGap]);

  const handleApplyFilters = () => {
    applyParams({
      window: draftWindow !== "7" ? draftWindow : "",
      gap: draftGap !== "0" ? draftGap : "",
    });
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    applyParams({ q: "", window: "", gap: "" });
    setFiltersOpen(false);
  };

  const windowLabel = windowOptions.find((o) => o.value === currentWindow)?.label ?? "Próximos 7 dias";
  const displayLabel = displayOptions.find((o) => o.value === currentGap)?.label ?? "Todos os produtos";

  const chips = useMemo(
    () =>
      [
        currentQuery.trim()
          ? { key: "q", label: `Busca: ${currentQuery.trim()}` }
          : null,
        currentWindow !== "7" ? { key: "window", label: windowLabel } : null,
        currentGap !== "0" ? { key: "gap", label: displayLabel } : null,
      ].filter(Boolean) as Array<{ key: string; label: string }>,
    [currentQuery, currentWindow, currentGap, windowLabel, displayLabel]
  );

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
          <div className={layoutStyles.searchWrap}>
            <Search size={18} className={layoutStyles.searchIcon} />
            <input
              type="text"
              name="q"
              placeholder="Buscar produto"
              defaultValue={currentQuery}
              key={currentQuery}
              onChange={(e) => {
                const v = e.target.value;
                if (debounceRef.current) window.clearTimeout(debounceRef.current);
                debounceRef.current = window.setTimeout(() => {
                  applyParams({ q: v.trim() || null });
                }, 250);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyParams({ q: (e.currentTarget.value || "").trim() || null });
                }
              }}
              aria-label="Buscar produto"
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
          <div className={layoutStyles.filtersWrap} ref={panelRef}>
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.filtersButton} ${
                filtersOpen || hasActiveFilters ? layoutStyles.filtersButtonActive : ""
              }`}
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="production-filters-panel"
            >
              <SlidersHorizontal size={16} />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className={layoutStyles.filtersBadge}>{activeFilterCount}</span>
              )}
            </button>
            {filtersOpen && (
              <div
                id="production-filters-panel"
                className={layoutStyles.filtersPanel}
                role="dialog"
                aria-label="Filtros de produção"
              >
                <div className={layoutStyles.filtersPanelHeader}>
                  <h3 className={layoutStyles.filtersPanelTitle}>
                    <ListFilter size={18} />
                    <span>Filtros</span>
                  </h3>
                  <button
                    type="button"
                    className={layoutStyles.filtersPanelClose}
                    onClick={() => setFiltersOpen(false)}
                    aria-label="Fechar filtros"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className={layoutStyles.filtersPanelBody}>
                  <div className={layoutStyles.filtersGroup}>
                    <div className={layoutStyles.filtersGroupHeader}>
                      <span>Período da demanda</span>
                    </div>
                    <div className={layoutStyles.filtersGroupContent}>
                      <div className={layoutStyles.filterField}>
                        <span className={layoutStyles.filterFieldLabel}>Próximos X dias</span>
                        <FilterSelect
                          options={windowOptions}
                          value={draftWindow}
                          onChange={(v) => setDraftWindow(v as CapacityWindowKey)}
                          disabled={isPending}
                          aria-label="Período da demanda"
                        />
                      </div>
                    </div>
                  </div>
                  <div className={layoutStyles.filtersGroup}>
                    <div className={layoutStyles.filtersGroupHeader}>
                      <span>Exibir</span>
                    </div>
                    <div className={layoutStyles.filtersGroupContent}>
                      <div className={layoutStyles.filterField}>
                        <span className={layoutStyles.filterFieldLabel}>Listar</span>
                        <FilterSelect
                          options={displayOptions}
                          value={draftGap}
                          onChange={setDraftGap}
                          disabled={isPending}
                          aria-label="Exibir"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className={layoutStyles.filtersPanelFooter}>
                  <button
                    type="button"
                    className={layoutStyles.filtersBtnClear}
                    onClick={handleClearFilters}
                    disabled={isPending}
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    className={layoutStyles.filtersBtnApply}
                    onClick={handleApplyFilters}
                    disabled={isPending}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {chips.length > 0 && (
        <div className={layoutStyles.chipsRow}>
          {chips.map((chip) => (
            <span key={chip.key} className={layoutStyles.chip}>
              {chip.label}
              <button
                type="button"
                onClick={() => {
                  if (chip.key === "q") applyParams({ q: null });
                  else if (chip.key === "window") applyParams({ window: null });
                  else applyParams({ gap: null });
                }}
                className={layoutStyles.chipButton}
                aria-label={`Remover ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
