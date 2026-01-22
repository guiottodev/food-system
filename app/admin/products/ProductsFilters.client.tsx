"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";

type CategoryOption = {
  id: string;
  name: string;
};

type ProductsFiltersProps = {
  categories: CategoryOption[];
  initialQuery: string;
  initialCategoryId: string;
  initialActive: string;
  initialHidden: string;
  initialSob: string;
};

const ACTIVE_LABELS: Record<string, string> = {
  active: "Ativos",
  inactive: "Inativos",
};

const HIDDEN_LABELS: Record<string, string> = {
  hidden: "Ocultos",
  public: "Publicos",
};

const SOB_LABELS: Record<string, string> = {
  yes: "Sob consulta",
  no: "Sem sob consulta",
};

export default function ProductsFilters({
  categories,
  initialQuery,
  initialCategoryId,
  initialActive,
  initialHidden,
  initialSob,
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
    return new Map(categories.map((category) => [category.id, category.name]));
  }, [categories]);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentCategory = searchParams.get("categoryId") ?? initialCategoryId;
  const currentActive = searchParams.get("active") ?? initialActive;
  const currentHidden = searchParams.get("hidden") ?? initialHidden;
  const currentSob = searchParams.get("sob") ?? initialSob;

  const hasActiveFilters =
    Boolean(currentQuery) ||
    Boolean(currentCategory) ||
    currentActive !== "all" ||
    currentHidden !== "all" ||
    currentSob !== "all";

  const applyParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsString);
      Object.entries(updates).forEach(([key, value]) => {
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
    currentHidden !== "all"
      ? {
          key: "hidden",
          label: `Visibilidade: ${HIDDEN_LABELS[currentHidden] ?? "Selecionada"}`,
          onRemove: () => applyParams({ hidden: "all" }),
        }
      : null,
    currentSob !== "all"
      ? {
          key: "sob",
          label: `Sob consulta: ${SOB_LABELS[currentSob] ?? "Selecionado"}`,
          onRemove: () => applyParams({ sob: "all" }),
        }
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
                    <select
                      name="categoryId"
                      value={currentCategory}
                      onChange={(event) =>
                        applyParams({ categoryId: event.target.value })
                      }
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="">Todas categorias</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <select
                      name="active"
                      value={currentActive}
                      onChange={(event) =>
                        applyParams({ active: event.target.value })
                      }
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="all">Ativos e inativos</option>
                      <option value="active">Somente ativos</option>
                      <option value="inactive">Somente inativos</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Publico</span>
                    <select
                      name="hidden"
                      value={currentHidden}
                      onChange={(event) =>
                        applyParams({ hidden: event.target.value })
                      }
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="all">Publico e oculto</option>
                      <option value="public">Somente publico</option>
                      <option value="hidden">Somente oculto</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Sob consulta</span>
                    <select
                      name="sob"
                      value={currentSob}
                      onChange={(event) => applyParams({ sob: event.target.value })}
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="all">Com ou sem sob consulta</option>
                      <option value="yes">Somente sob consulta</option>
                      <option value="no">Sem sob consulta</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <Link
          href="/admin/products/new"
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
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
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
