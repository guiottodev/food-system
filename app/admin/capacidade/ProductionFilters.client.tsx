"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Calendar } from "lucide-react";
import {
  normalizeCapacityWindow,
  type CapacityWindowKey,
} from "@/lib/domain/production";
import FiltersPanel from "../_components/FiltersPanel.client";
import FilterSelect from "../orders/FilterSelect.client";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./capacidade.module.css";

const windowOptions: Array<{ value: CapacityWindowKey; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7", label: "Próximos 7 dias" },
  { value: "14", label: "Próximos 14 dias" },
  { value: "30", label: "Próximos 30 dias" },
];

const productionWindowOptions: Array<{ value: CapacityWindowKey; label: string }> = [
  { value: "15", label: "Últimos 15 dias" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "14", label: "Últimos 14 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "today", label: "Hoje" },
];

const displayOptions = [
  { value: "0", label: "Todos os produtos" },
  { value: "1", label: "Somente os que precisam de produção" },
];

type ProductionFiltersProps = {
  initialQuery: string;
  initialWindow: CapacityWindowKey; // demanda default (provavelmente 7)
  initialProductionWindow?: CapacityWindowKey; // produção default 15
  initialGapOnly: boolean;
};

export default function ProductionFilters({
  initialQuery,
  initialWindow,
  initialProductionWindow,
  initialGapOnly,
}: ProductionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentWindow = normalizeCapacityWindow(searchParams.get("window") ?? initialWindow);
  const currentProductionWindow = normalizeCapacityWindow(
    searchParams.get("productionWindow") ?? initialProductionWindow ?? "15" // Default: 15
  );
  const currentGap = searchParams.get("gap") ?? (initialGapOnly ? "1" : "0");

  const [draftWindow, setDraftWindow] = useState<CapacityWindowKey>(currentWindow);
  const [draftProductionWindow, setDraftProductionWindow] = useState<CapacityWindowKey>(currentProductionWindow);
  const [draftGap, setDraftGap] = useState(currentGap);

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

  const syncDrafts = useCallback(() => {
    setDraftWindow(currentWindow);
    setDraftProductionWindow(currentProductionWindow);
    setDraftGap(currentGap);
  }, [currentWindow, currentProductionWindow, currentGap]);

  const handleApplyFilters = () => {
    applyParams({
      window: draftWindow !== "7" ? draftWindow : null, // Default demanda
      productionWindow: draftProductionWindow !== "15" ? draftProductionWindow : null, // Default: 15
      gap: draftGap !== "0" ? draftGap : null,
    });
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    // Limpar todos os filtros e resetar sort para gap desc
    const params = new URLSearchParams();
    params.set("sort", "gap");
    params.set("dir", "desc");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
    setFiltersOpen(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentWindow !== "7") count++; // Default demanda
    if (currentProductionWindow !== "15") count++; // Default produção: 15
    if (currentGap !== "0") count++;
    return count;
  }, [currentWindow, currentProductionWindow, currentGap]);

  const windowLabel = windowOptions.find((o) => o.value === currentWindow)?.label ?? "Próximos 7 dias";
  const productionWindowLabel = productionWindowOptions.find(
    (o) => o.value === currentProductionWindow
  )?.label ?? "Últimos 15 dias";
  const displayLabel = displayOptions.find((o) => o.value === currentGap)?.label ?? "Todos os produtos";

  const chips = useMemo(
    () =>
      [
        currentQuery.trim()
          ? { key: "q", label: `Busca: ${currentQuery.trim()}` }
          : null,
        currentWindow !== "7" // Só aparece quando != default
          ? { key: "window", label: `Demanda: ${windowLabel}` }
          : null,
        currentProductionWindow !== "15" // Só aparece quando != default
          ? { 
              key: "productionWindow", 
              label: `Produção: ${productionWindowLabel}` 
            }
          : null,
        currentGap !== "0" ? { key: "gap", label: displayLabel } : null,
      ].filter(Boolean) as Array<{ key: string; label: string }>,
    [currentQuery, currentWindow, currentProductionWindow, currentGap, windowLabel, productionWindowLabel, displayLabel]
  );

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
          <div className={layoutStyles.searchWrap}>
            <Search size={18} className={layoutStyles.searchIcon} aria-hidden />
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
          {chips.length > 0 && (
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.clearButton}`}
              onClick={handleClearFilters}
            >
              Limpar
            </button>
          )}
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
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Calendar size={16} aria-hidden />
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
                  <Calendar size={16} aria-hidden />
                  <span>Período da produção</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Últimos X dias</span>
                    <FilterSelect
                      options={productionWindowOptions}
                      value={draftProductionWindow}
                      onChange={(v) => setDraftProductionWindow(v as CapacityWindowKey)}
                      disabled={isPending}
                      aria-label="Período da produção"
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
            </FiltersPanel>
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
                  else if (chip.key === "window") applyParams({ window: null }); // Volta para default demanda
                  else if (chip.key === "productionWindow") applyParams({ productionWindow: null }); // Volta para default 15
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
