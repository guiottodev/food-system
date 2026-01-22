"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createCategoryAction } from "./actions";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./categories.module.css";

type CategoriesFiltersProps = {
  initialQuery: string;
  error?: string;
  openModalOnLoad?: boolean;
};

export default function CategoriesFilters({
  initialQuery,
  error,
  openModalOnLoad,
}: CategoriesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(Boolean(openModalOnLoad));
  const [modalError, setModalError] = useState(
    error === "nome" && openModalOnLoad ? "Informe o nome da categoria." : ""
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const hasActiveFilters = Boolean(currentQuery.trim());

  const applyParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsString);
      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
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

  useEffect(() => {
    if (!modalOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [modalOpen]);

  useEffect(() => {
    if (openModalOnLoad) {
      setModalOpen(true);
      if (error === "nome") {
        setModalError("Informe o nome da categoria.");
      }
    }
  }, [error, openModalOnLoad]);

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
              aria-controls="categories-filters-panel"
            >
              Filtros
            </button>
            {filtersOpen ? (
              <div
                id="categories-filters-panel"
                className={layoutStyles.filtersPanel}
                role="dialog"
                aria-label="Filtros de categorias"
              >
                <div className={layoutStyles.filtersEmpty}>
                  Nenhum filtro adicional disponivel.
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => {
            setModalError("");
            setModalOpen(true);
          }}
        >
          Nova categoria
        </button>
      </div>

      {modalOpen ? (
        <div
          className={layoutStyles.modalOverlay}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={layoutStyles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={layoutStyles.modalHeader}>
              <h2 className={layoutStyles.modalTitle}>Nova categoria</h2>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                onClick={() => setModalOpen(false)}
                aria-label="Fechar modal"
              >
                Fechar
              </button>
            </div>
            {modalError ? (
              <div className={styles.textError}>{modalError}</div>
            ) : null}
            <form
              action={createCategoryAction}
              className={styles.formSection}
              onSubmit={() => setModalError("")}
            >
              <input
                name="name"
                placeholder="Nome"
                required
                className={styles.control}
              />
              <textarea
                name="description"
                placeholder="Descricao (opcional)"
                className={`${styles.control} ${styles.controlTextarea}`}
              ></textarea>
              <label className={styles.choiceRow}>
                <input type="checkbox" name="isActive" defaultChecked />
                <span className={styles.choiceLabel}>Ativa</span>
              </label>
              <div className={layoutStyles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonGhost}`}
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={isPending}
                >
                  Criar categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
