"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, Package, Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FiltersPanel from "../_components/FiltersPanel.client";
import FilterSelect from "./FilterSelect.client";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";

type CategoryOption = {
  id: string;
  label: string;
};

type ProductsFiltersProps = {
  categories: CategoryOption[];
  initialQuery: string;
  initialCategoryId: string;
  initialActive: string;
  initialStock?: string;
  initialSemSkuAtivo?: string;
};

const ACTIVE_LABELS: Record<string, string> = {
  active: "Ativos",
  inactive: "Inativos",
};

export default function ProductsFilters({
  categories,
  initialQuery,
  initialCategoryId,
  initialActive,
  initialStock = "",
  initialSemSkuAtivo = "",
}: ProductsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const categoryLookup = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.label]));
  }, [categories]);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentCategory = searchParams.get("categoryId") ?? initialCategoryId ?? "";
  const currentActive = searchParams.get("active") ?? initialActive ?? "all";
  const currentStock = searchParams.get("stock") ?? initialStock ?? "";
  const currentSemSkuAtivo = searchParams.get("semSkuAtivo") ?? initialSemSkuAtivo ?? "";

  const [draftCategory, setDraftCategory] = useState(currentCategory);
  const [draftActive, setDraftActive] = useState(currentActive);
  const [draftStock, setDraftStock] = useState(currentStock);
  const [draftSemSkuAtivo, setDraftSemSkuAtivo] = useState(currentSemSkuAtivo);

  const applyParams = useCallback(
    (updates: Record<string, string | null>) => {
      const filterKeys = ["q", "categoryId", "active", "stock", "semSkuAtivo"];
      if (Object.keys(updates).some((k) => filterKeys.includes(k))) {
        updates = { ...updates, page: "1" };
      }
      const params = new URLSearchParams(searchParamsString);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        if (!value || value === "all") {
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
    [pathname, router, searchParamsString, startTransition],
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
      setDraftCategory(currentCategory);
      setDraftActive(currentActive);
      setDraftStock(currentStock);
      setDraftSemSkuAtivo(currentSemSkuAtivo);
    }
  }, [filtersOpen, currentCategory, currentActive, currentStock, currentSemSkuAtivo]);

  const handleApplyFilters = () => {
    applyParams({
      categoryId: draftCategory || "",
      active: draftActive !== "all" ? draftActive : "",
      stock: draftStock || "",
      semSkuAtivo: draftSemSkuAtivo || "",
    });
    setFiltersOpen(false);
  };

  const handleClearFilters = useCallback(() => {
    applyParams({ q: "", categoryId: "", active: "all", stock: "", semSkuAtivo: "", page: "1" });
    setFiltersOpen(false);
  }, [applyParams]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (currentCategory) count++;
    if (currentActive !== "all") count++;
    if (currentStock) count++;
    if (currentSemSkuAtivo === "1") count++;
    return count;
  }, [currentCategory, currentActive, currentStock, currentSemSkuAtivo]);

  const hasActiveFilters =
    Boolean(currentQuery) ||
    Boolean(currentCategory) ||
    currentActive !== "all" ||
    Boolean(currentStock) ||
    currentSemSkuAtivo === "1";

  const chips = [
    currentQuery
      ? {
          key: "q",
          label: `Busca: ${currentQuery}`,
          onRemove: () => applyParams({ q: "" }),
        }
      : null,
    currentCategory
      ? {
          key: "categoryId",
          label: `Categoria: ${categoryLookup.get(currentCategory) ?? "Selecionada"}`,
          onRemove: () => applyParams({ categoryId: "" }),
        }
      : null,
    currentActive !== "all"
      ? {
          key: "active",
          label: `Status: ${ACTIVE_LABELS[currentActive] ?? "Selecionado"}`,
          onRemove: () => applyParams({ active: "all" }),
        }
      : null,
    currentStock === "in"
      ? { key: "stock", label: "Em estoque", onRemove: () => applyParams({ stock: "" }) }
      : currentStock === "out"
      ? { key: "stock", label: "Fora de estoque", onRemove: () => applyParams({ stock: "" }) }
      : null,
    currentSemSkuAtivo === "1"
      ? { key: "semSkuAtivo", label: "Sem SKU ativo", onRemove: () => applyParams({ semSkuAtivo: "" }) }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    onRemove: () => void;
  }>;

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
          <div className={layoutStyles.searchWrap}>
            <Search size={18} className={layoutStyles.searchIcon} aria-hidden />
            <input
              type="text"
              name="q"
              placeholder="Buscar por nome"
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
              aria-label="Buscar por nome"
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
              syncMode="url"
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onToggle={() => setFiltersOpen((o) => !o)}
            >
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Package size={16} aria-hidden />
                  <span>Categoria</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Categoria</span>
                    <FilterSelect
                      options={[
                        { value: "", label: "Todas categorias" },
                        ...categories.map((category) => ({
                          value: category.id,
                          label: category.label,
                        })),
                      ]}
                      value={draftCategory}
                      onChange={setDraftCategory}
                      disabled={isPending}
                      placeholder="Todas categorias"
                      aria-label="Categoria"
                    />
                  </div>
                </div>
              </div>
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Filter size={16} aria-hidden />
                  <span>Status</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Status</span>
                    <FilterSelect
                      options={[
                        { value: "all", label: "Ativos e inativos" },
                        { value: "active", label: "Somente ativos" },
                        { value: "inactive", label: "Somente inativos" },
                      ]}
                      value={draftActive}
                      onChange={setDraftActive}
                      disabled={isPending}
                      placeholder="Ativos e inativos"
                      aria-label="Status"
                    />
                  </div>
                </div>
              </div>
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <span>Estoque</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Estoque</span>
                    <FilterSelect
                      options={[
                        { value: "", label: "Todas" },
                        { value: "in", label: "Em estoque" },
                        { value: "out", label: "Fora de estoque" },
                      ]}
                      value={draftStock}
                      onChange={setDraftStock}
                      disabled={isPending}
                      placeholder="Todas"
                      aria-label="Estoque"
                    />
                  </div>
                </div>
              </div>
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <span>SKU ativo</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>SKU ativo</span>
                    <FilterSelect
                      options={[
                        { value: "", label: "Todas" },
                        { value: "1", label: "Somente sem SKU ativo" },
                      ]}
                      value={draftSemSkuAtivo}
                      onChange={setDraftSemSkuAtivo}
                      disabled={isPending}
                      placeholder="Todas"
                      aria-label="SKU ativo"
                    />
                  </div>
                </div>
              </div>
            </FiltersPanel>
          </div>
        </div>
        <Link
          href="/admin/products/new"
          className={`${styles.button} ${styles.buttonPrimary} ${layoutStyles.buttonWithIcon}`}
        >
          <Plus size={18} aria-hidden />
          Novo produto
        </Link>
      </div>

      {chips.length > 0 ? (
        <div className={layoutStyles.chipsRow}>
          {chips.map((chip) => (
            <span key={chip.key} className={layoutStyles.chip}>
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                className={layoutStyles.chipButton}
                aria-label={`Remover filtro ${chip.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
