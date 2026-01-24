"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Folder, Tag } from "lucide-react";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./categories.module.css";
import { updateCategoryAction } from "./actions";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  depth: number;
  pathLabel: string;
  directCount: number;
  totalCount: number;
  childrenCount: number;
  // Para UX (cascata)
  descendantCount: number;
};

function buildChildrenMap(rows: CategoryRow[]) {
  const byParent = new Map<string, string[]>();
  for (const row of rows) {
    const key = row.parentId ?? "ROOT";
    const list = byParent.get(key) ?? [];
    list.push(row.id);
    byParent.set(key, list);
  }
  return byParent;
}

export default function CategoriesTreeClient({ rows }: { rows: CategoryRow[] }) {
  const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const childrenByParent = useMemo(() => buildChildrenMap(rows), [rows]);

  const expandableIds = useMemo(
    () => rows.filter((r) => r.childrenCount > 0).map((r) => r.id),
    [rows]
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(expandableIds)
  );

  // Recalcular quando mudar o dataset (ex.: filtros/busca)
  useEffect(() => {
    setExpanded(new Set(expandableIds));
  }, [expandableIds]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId ? rowById.get(editingId) ?? null : null;

  const [showCascadeConfirm, setShowCascadeConfirm] = useState(false);
  const [cascadeConfirmed, setCascadeConfirmed] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    setShowCascadeConfirm(false);
    setCascadeConfirmed(false);
    // Focus inicial
    setTimeout(() => nameRef.current?.focus(), 0);
  }, [editing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing]);

  const renderedRows = useMemo(() => {
    const result: CategoryRow[] = [];
    const walk = (parentKey: string, depth: number) => {
      const childIds = childrenByParent.get(parentKey) ?? [];
      for (const id of childIds) {
        const row = rowById.get(id);
        if (!row) continue;
        result.push({ ...row, depth });
        if (row.childrenCount > 0 && expanded.has(row.id)) {
          walk(row.id, depth + 1);
        }
      }
    };
    walk("ROOT", 0);
    return result;
  }, [childrenByParent, expanded, rowById]);

  const collapseAll = () => setExpanded(new Set());
  const expandAll = () => setExpanded(new Set(expandableIds));

  return (
    <>
      <div className={layoutStyles.treeToolbar}>
        <div className={layoutStyles.treeToolbarLeft}>
          <span className={styles.textMuted}>
            Mostrando <strong>{rows.length}</strong> categoria(s)
          </span>
        </div>
        <div className={layoutStyles.treeToolbarRight}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
            onClick={expandAll}
            disabled={expandableIds.length === 0}
          >
            Expandir tudo
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
            onClick={collapseAll}
            disabled={expandableIds.length === 0}
          >
            Recolher tudo
          </button>
        </div>
      </div>

      <div className={layoutStyles.tableWrap}>
        <table className={layoutStyles.table}>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Ativo</th>
              <th
                className={layoutStyles.colNumeric}
                title="Produtos cadastrados diretamente nesta categoria."
              >
                Produtos (direto)
              </th>
              <th
                className={layoutStyles.colNumeric}
                title="Produtos na categoria e em todas as subcategorias abaixo."
              >
                Produtos (total)
              </th>
              <th className={layoutStyles.colActions}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {renderedRows.map((row) => {
              const isLeaf = row.childrenCount === 0;
              const isExpandable = row.childrenCount > 0;
              const isExpanded = expanded.has(row.id);
              return (
                <tr key={row.id}>
                  <td
                    className={layoutStyles.categoryCell}
                    data-depth={row.depth}
                  >
                    <div className={layoutStyles.categoryCellInner}>
                      {isExpandable ? (
                        <button
                          type="button"
                          className={layoutStyles.expanderButton}
                          onClick={() => {
                            setExpanded((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              return next;
                            });
                          }}
                          aria-label={isExpanded ? "Recolher" : "Expandir"}
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      ) : (
                        <span className={layoutStyles.expanderSpacer} />
                      )}
                      <span
                        className={layoutStyles.categoryTypeIcon}
                        title={isLeaf ? "Categoria folha" : "Categoria pai"}
                      >
                        {isLeaf ? <Tag size={16} /> : <Folder size={16} />}
                      </span>
                      <div>
                        <span className={layoutStyles.categoryName}>{row.name}</span>
                        {row.depth > 0 ? (
                          <span className={layoutStyles.categoryPath}>
                            {row.pathLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>{row.description || "—"}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        row.isActive ? styles.badgeSuccess : styles.badgeNeutral
                      }`}
                    >
                      {row.isActive ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className={layoutStyles.colNumeric}>
                    <span
                      className={`${layoutStyles.countBadge} ${
                        row.directCount === 0 ? layoutStyles.countBadgeMuted : ""
                      }`}
                    >
                      {row.directCount}
                    </span>
                  </td>
                  <td className={layoutStyles.colNumeric}>
                    <span
                      className={`${layoutStyles.countBadge} ${
                        row.totalCount === 0 ? layoutStyles.countBadgeMuted : ""
                      }`}
                    >
                      {row.totalCount}
                    </span>
                  </td>
                  <td className={layoutStyles.colActions}>
                    <div className={layoutStyles.inlineActions}>
                      <a
                        href={`/admin/categories?modal=1&parentId=${row.id}`}
                        className={layoutStyles.subAction}
                      >
                        + Subcategoria
                      </a>
                      <button
                        type="button"
                        className={layoutStyles.actionButton}
                        onClick={() => setEditingId(row.id)}
                      >
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          className={layoutStyles.modalOverlay}
          onClick={() => setEditingId(null)}
        >
          <div
            className={layoutStyles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={layoutStyles.modalHeader}>
              <h2 className={layoutStyles.modalTitle}>Editar categoria</h2>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                onClick={() => setEditingId(null)}
              >
                Fechar
              </button>
            </div>

            <div className={layoutStyles.modalBody}>
              <form
                action={updateCategoryAction}
                className={styles.formSection}
                onSubmit={(e) => {
                  const form = e.currentTarget;
                  const active = (form.elements.namedItem("isActive") as HTMLInputElement)
                    ?.checked;
                  // Se está desativando, exigir confirmação (cascata).
                  if (editing.isActive && !active && !cascadeConfirmed) {
                    e.preventDefault();
                    setShowCascadeConfirm(true);
                  }
                }}
              >
                <input type="hidden" name="id" value={editing.id} />

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Nome</span>
                  <input
                    ref={nameRef}
                    name="name"
                    defaultValue={editing.name}
                    required
                    className={styles.control}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Descrição</span>
                  <textarea
                    name="description"
                    defaultValue={editing.description || ""}
                    placeholder="Descrição (opcional)"
                    className={`${styles.control} ${styles.controlTextarea}`}
                  ></textarea>
                </label>

                <label className={styles.choiceRow}>
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={editing.isActive}
                    onChange={() => {
                      setShowCascadeConfirm(false);
                      setCascadeConfirmed(false);
                    }}
                  />
                  <span className={styles.choiceLabel}>Ativa</span>
                </label>

                {!editing.isActive ? (
                  <div className={`${styles.notice} ${styles.noticeWarning}`}>
                    Esta categoria está inativa. Para ativar, o pai precisa estar ativo.
                  </div>
                ) : null}

                {showCascadeConfirm ? (
                  <div className={`${styles.notice} ${styles.noticeWarning}`}>
                    <div>
                      <strong>Atenção:</strong> desativar esta categoria irá desativar{" "}
                      <strong>{editing.descendantCount}</strong> subcategoria(s) e pode
                      afetar <strong>{editing.totalCount}</strong> produto(s) na
                      subárvore.
                      <div style={{ marginTop: 8 }}>
                        <label className={styles.choiceRow}>
                          <input
                            type="checkbox"
                            checked={cascadeConfirmed}
                            onChange={(e) => setCascadeConfirmed(e.currentTarget.checked)}
                          />
                          <span className={styles.choiceLabel}>
                            Eu entendo e quero desativar mesmo assim
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className={layoutStyles.modalFooter}>
                  <button
                    type="button"
                    className={`${styles.button} ${styles.buttonGhost}`}
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`${styles.button} ${styles.buttonPrimary}`}
                    disabled={showCascadeConfirm && !cascadeConfirmed}
                    title={
                      showCascadeConfirm && !cascadeConfirmed
                        ? "Confirme a desativação para continuar."
                        : undefined
                    }
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

