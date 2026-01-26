"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Filter, Layers, Package } from "lucide-react";
import FiltersPanel from "../_components/FiltersPanel.client";
import FilterSelect from "../orders/FilterSelect.client";
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
  const [modalParentId, setModalParentId] = useState<string>(
    () => initialParentId ?? ""
  );
  const [modalError, setModalError] = useState(
    error === "nome" && openModalOnLoad ? "Informe o nome da categoria." : ""
  );
  const debounceRef = useRef<number | null>(null);

  const currentQuery = searchParams.get("q") ?? initialQuery;
  const currentActive = searchParams.get("active") ?? initialActive ?? "all";
  const currentKind = searchParams.get("kind") ?? initialKind ?? "all";
  const currentHas = searchParams.get("has") ?? initialHas ?? "all";

  const [draftActive, setDraftActive] = useState(currentActive);
  const [draftKind, setDraftKind] = useState(currentKind);
  const [draftHas, setDraftHas] = useState(currentHas);

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

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setModalError("");
    applyParams({ modal: "", parentId: "", error: "" });
  }, [applyParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) {
      setDraftActive(currentActive);
      setDraftKind(currentKind);
      setDraftHas(currentHas);
    }
  }, [filtersOpen, currentActive, currentKind, currentHas]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [closeModal, modalOpen]);

  useEffect(() => {
    if (openModalOnLoad) {
      setModalOpen(true);
      const currentParentId = searchParams.get("parentId") ?? initialParentId ?? "";
      setModalParentId(currentParentId);
      if (error === "nome") setModalError("Informe o nome da categoria.");
      if (error === "duplicado")
        setModalError("Já existe uma categoria com esse nome nesse nível.");
      if (error === "pai_invalido")
        setModalError("Categoria pai inválida (ou inativa).");
      if (error === "pai_inativo")
        setModalError("Não é possível ativar: a categoria pai está inativa.");
    }
  }, [error, openModalOnLoad, initialParentId, searchParams]);

  const handleApplyFilters = () => {
    applyParams({
      active: draftActive !== "all" ? draftActive : "",
      kind: draftKind !== "all" ? draftKind : "",
      has: draftHas !== "all" ? draftHas : "",
    });
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    applyParams({ q: "", active: "all", kind: "all", has: "all" });
    setFiltersOpen(false);
  };

  const filterActiveCount = useMemo(() => {
    let count = 0;
    if (currentActive !== "all") count++;
    if (currentKind !== "all") count++;
    if (currentHas !== "all") count++;
    return count;
  }, [currentActive, currentKind, currentHas]);

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
              className={layoutStyles.searchInput}
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
              activeCount={filterActiveCount}
              onApply={handleApplyFilters}
              onClear={handleClearFilters}
              syncMode="url"
              isOpen={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              onToggle={() => setFiltersOpen((o) => !o)}
            >
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
                        { value: "all", label: "Ativas e inativas" },
                        { value: "active", label: "Somente ativas" },
                        { value: "inactive", label: "Somente inativas" },
                      ]}
                      value={draftActive}
                      onChange={setDraftActive}
                      disabled={isPending}
                      placeholder="Ativas e inativas"
                      aria-label="Status"
                    />
                  </div>
                </div>
              </div>
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Layers size={16} aria-hidden />
                  <span>Tipo</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Tipo</span>
                    <FilterSelect
                      options={[
                        { value: "all", label: "Todas" },
                        { value: "root", label: "Somente raiz" },
                        { value: "leaf", label: "Somente folhas" },
                      ]}
                      value={draftKind}
                      onChange={setDraftKind}
                      disabled={isPending}
                      placeholder="Todas"
                      aria-label="Tipo"
                    />
                  </div>
                </div>
              </div>
              <div className={layoutStyles.filtersGroup}>
                <div className={layoutStyles.filtersGroupHeader}>
                  <Package size={16} aria-hidden />
                  <span>Produtos</span>
                </div>
                <div className={layoutStyles.filtersGroupContent}>
                  <div className={layoutStyles.filterField}>
                    <span className={layoutStyles.filterFieldLabel}>Produtos</span>
                    <FilterSelect
                      options={[
                        { value: "all", label: "Todas" },
                        { value: "direct", label: "Com produtos diretos" },
                        { value: "any", label: "Com produtos (total)" },
                      ]}
                      value={draftHas}
                      onChange={setDraftHas}
                      disabled={isPending}
                      placeholder="Todas"
                      aria-label="Produtos"
                    />
                  </div>
                </div>
              </div>
            </FiltersPanel>
          </div>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => {
            setModalError("");
            setModalParentId("");
            setModalOpen(true);
            applyParams({ modal: "", parentId: "", error: "" });
          }}
        >
          Nova categoria
        </button>
      </div>

      {modalOpen ? (
        <div
          className={layoutStyles.modalOverlay}
          onClick={closeModal}
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
                onClick={closeModal}
                aria-label="Fechar modal"
              >
                Fechar
              </button>
            </div>

            <div className={layoutStyles.modalBody}>
              {modalError ? (
                <div className={styles.textError}>{modalError}</div>
              ) : null}

              <div className={layoutStyles.modalHint}>
                Dica: selecione uma <strong>categoria pai</strong> para criar uma
                subcategoria (ex.: Salgados → Fritos).
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
                    value={modalParentId}
                    onChange={(e) => setModalParentId(e.target.value)}
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
                  placeholder="Descrição (opcional)"
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
                    onClick={closeModal}
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
                ×
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
                ×
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
                ×
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
                ×
              </button>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
