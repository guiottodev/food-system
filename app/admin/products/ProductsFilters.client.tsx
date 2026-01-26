"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";
import FilterSelect from "./FilterSelect.client";

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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const categoryLookup = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category.label]));
  }, [categories]);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentCategory = searchParams.get("categoryId") ?? initialCategoryId ?? "";
  const currentActive = searchParams.get("active") ?? initialActive ?? "all";
  const currentStock = searchParams.get("stock") ?? initialStock ?? "";
  const currentSemSkuAtivo = searchParams.get("semSkuAtivo") ?? initialSemSkuAtivo ?? "";
  const hasActiveFilters =
    Boolean(currentQuery) ||
    Boolean(currentCategory) ||
    currentActive !== "all" ||
    Boolean(currentStock) ||
    currentSemSkuAtivo === "1";

  const activeFilterCount = [
    Boolean(currentQuery),
    Boolean(currentCategory),
    currentActive !== "all",
    Boolean(currentStock),
    currentSemSkuAtivo === "1",
  ].filter(Boolean).length;

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

  const handleClearFilters = useCallback(() => {
    applyParams({ q: "", categoryId: "", active: "all", stock: "", semSkuAtivo: "", page: "1" });
    setFiltersOpen(false);
  }, [applyParams]);

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
          <div className={layoutStyles.filtersWrap} ref={panelRef}>
            <button
              type="button"
              className={`${styles.button} ${layoutStyles.filtersButton} ${
                filtersOpen || hasActiveFilters ? layoutStyles.filtersButtonActive : ""
              }`}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="products-filters-panel"
            >
              Filtros
              {activeFilterCount > 0 ? (
                <span className={layoutStyles.filtersBadge}>{activeFilterCount}</span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div
                id="products-filters-panel"
                className={layoutStyles.filtersPanel}
                role="dialog"
                aria-label="Filtros de produtos"
              >
                <div className={layoutStyles.filtersGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Categoria</span>
                    <FilterSelect
                      options={[
                        { value: "", label: "Todas categorias" },
                        ...categories.map((category) => ({
                          value: category.id,
                          label: category.label,
                        })),
                      ]}
                      value={currentCategory}
                      onChange={(value) => applyParams({ categoryId: value })}
                      disabled={isPending}
                      placeholder="Todas categorias"
                      aria-label="Categoria"
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <FilterSelect
                      options={[
                        { value: "all", label: "Ativos e inativos" },
                        { value: "active", label: "Somente ativos" },
                        { value: "inactive", label: "Somente inativos" },
                      ]}
                      value={currentActive}
                      onChange={(value) => applyParams({ active: value })}
                      disabled={isPending}
                      placeholder="Ativos e inativos"
                      aria-label="Status"
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Estoque</span>
                    <FilterSelect
                      options={[
                        { value: "", label: "Todas" },
                        { value: "in", label: "Em estoque" },
                        { value: "out", label: "Fora de estoque" },
                      ]}
                      value={currentStock}
                      onChange={(value) => applyParams({ stock: value })}
                      disabled={isPending}
                      placeholder="Todas"
                      aria-label="Estoque"
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>SKU ativo</span>
                    <FilterSelect
                      options={[
                        { value: "", label: "Todas" },
                        { value: "1", label: "Somente sem SKU ativo" },
                      ]}
                      value={currentSemSkuAtivo}
                      onChange={(value) => applyParams({ semSkuAtivo: value })}
                      disabled={isPending}
                      placeholder="Todas"
                      aria-label="SKU ativo"
                    />
                  </label>
                </div>
              </div>
            ) : null}
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
