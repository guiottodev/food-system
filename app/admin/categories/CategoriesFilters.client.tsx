"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { createCategoryAction } from "./actions";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./categories.module.css";

type CategoriesFiltersProps = {
  initialQuery: string;
  parentOptions: Array<{ id: string; label: string }>;
  error?: string;
  openModalOnLoad?: boolean;
  initialParentId?: string;
  initialActive?: string;
  initialKind?: string;
  initialHas?: string;
};

export default function CategoriesFilters({
  initialQuery,
  parentOptions,
  error,
  openModalOnLoad,
  initialParentId,
  initialActive,
  initialKind,
  initialHas,
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
  const currentParentId =
    searchParams.get("parentId") ?? initialParentId ?? "";
  const currentActive = searchParams.get("active") ?? initialActive ?? "all";
  const currentKind = searchParams.get("kind") ?? initialKind ?? "all";
  const currentHas = searchParams.get("has") ?? initialHas ?? "all";
  const activeFilterCount =
    (currentQuery.trim() ? 1 : 0) +
    (currentActive !== "all" ? 1 : 0) +
    (currentKind !== "all" ? 1 : 0) +
    (currentHas !== "all" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

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
      if (error === "nome") setModalError("Informe o nome da categoria.");
      if (error === "duplicado")
        setModalError("Já existe uma categoria com esse nome nesse nível.");
      if (error === "pai_invalido")
        setModalError("Categoria pai inválida (ou inativa).");
      if (error === "pai_inativo")
        setModalError("Não é possível ativar: a categoria pai está inativa.");
    }
  }, [error, openModalOnLoad]);

  return (
    <div className={layoutStyles.toolbarBlock}>
      <div className={layoutStyles.toolbar}>
        <div className={layoutStyles.toolbarMain}>
          <div className={layoutStyles.searchWrap}>
            <Search size={18} className={layoutStyles.searchIcon} />
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
              className={layoutStyles.searchInput}
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
              {activeFilterCount > 0 ? (
                <span className={layoutStyles.filtersCountBadge}>
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            {filtersOpen ? (
              <div
                id="categories-filters-panel"
                className={layoutStyles.filtersPanel}
                role="dialog"
                aria-label="Filtros de categorias"
              >
                <div className={layoutStyles.filtersHeader}>
                  <div className={layoutStyles.filtersHeaderTitle}>Filtros</div>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                    onClick={() => setFiltersOpen(false)}
                  >
                    Fechar
                  </button>
                </div>

                <div className={layoutStyles.filtersGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Status</span>
                    <select
                      name="active"
                      value={currentActive}
                      onChange={(e) => applyParams({ active: e.target.value })}
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="all">Ativas e inativas</option>
                      <option value="active">Somente ativas</option>
                      <option value="inactive">Somente inativas</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Tipo</span>
                    <select
                      name="kind"
                      value={currentKind}
                      onChange={(e) => applyParams({ kind: e.target.value })}
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="all">Todas</option>
                      <option value="root">Somente raiz</option>
                      <option value="leaf">Somente folhas</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Produtos</span>
                    <select
                      name="has"
                      value={currentHas}
                      onChange={(e) => applyParams({ has: e.target.value })}
                      className={styles.control}
                      disabled={isPending}
                    >
                      <option value="all">Todas</option>
                      <option value="direct">Com produtos diretos</option>
                      <option value="any">Com produtos (total)</option>
                    </select>
                  </label>
                </div>

                <div className={layoutStyles.filtersFooter}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonGhost}`}
                    onClick={() =>
                      applyParams({ q: "", active: "all", kind: "all", has: "all" })
                    }
                    disabled={!hasActiveFilters || isPending}
                  >
                    Limpar
                  </button>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => setFiltersOpen(false)}
                  >
                    Aplicar
                  </button>
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
            <div className={styles.textMuted} style={{ padding: "0 var(--space-4)" }}>
              <span className={layoutStyles.modalHint}>
                Dica: selecione uma <strong>categoria pai</strong> para criar uma subcategoria
                (ex.: Salgados → Fritos).
              </span>
            </div>
            <form
              action={createCategoryAction}
              className={styles.formSection}
              onSubmit={() => setModalError("")}
            >
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Categoria pai (opcional)</span>
                <select
                  name="parentId"
                  defaultValue={currentParentId}
                  className={styles.control}
                >
                  <option value="">(Sem pai) — categoria raiz</option>
                  {parentOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
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

      {hasActiveFilters ? (
        <div className={layoutStyles.chipsRow}>
          {currentQuery.trim() ? (
            <span className={layoutStyles.chip}>
              Busca: {currentQuery}
              <button
                type="button"
                className={layoutStyles.chipButton}
                onClick={() => applyParams({ q: "" })}
                aria-label="Remover filtro de busca"
              >
                x
              </button>
            </span>
          ) : null}
          {currentActive !== "all" ? (
            <span className={layoutStyles.chip}>
              Status: {currentActive === "active" ? "Ativas" : "Inativas"}
              <button
                type="button"
                className={layoutStyles.chipButton}
                onClick={() => applyParams({ active: "all" })}
                aria-label="Remover filtro de status"
              >
                x
              </button>
            </span>
          ) : null}
          {currentKind !== "all" ? (
            <span className={layoutStyles.chip}>
              Tipo: {currentKind === "root" ? "Raiz" : "Folhas"}
              <button
                type="button"
                className={layoutStyles.chipButton}
                onClick={() => applyParams({ kind: "all" })}
                aria-label="Remover filtro de tipo"
              >
                x
              </button>
            </span>
          ) : null}
          {currentHas !== "all" ? (
            <span className={layoutStyles.chip}>
              Produtos: {currentHas === "direct" ? "Direto" : "Total"}
              <button
                type="button"
                className={layoutStyles.chipButton}
                onClick={() => applyParams({ has: "all" })}
                aria-label="Remover filtro de produtos"
              >
                x
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
