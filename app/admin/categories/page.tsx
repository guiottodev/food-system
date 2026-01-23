import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateCategoryAction } from "./actions";
import CategoriesFilters from "./CategoriesFilters.client";
import layoutStyles from "./categories.module.css";
import styles from "../_styles/adminPrimitives.module.css";

type CategoriesSearchParams = {
  q?: string;
  error?: string;
  modal?: string;
  parentId?: string;
  edit?: string;
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<CategoriesSearchParams> | CategoriesSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const query = (sp?.q ?? "").trim();
  const error = sp?.error;
  const openModal = sp?.modal === "1";
  const parentIdParam = (sp?.parentId ?? "").trim();
  const editId = (sp?.edit ?? "").trim();

  const [categories, productCounts] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        isActive: true,
      },
    }),
    prisma.product.groupBy({
      by: ["categoryId"],
      _count: { _all: true },
    }),
  ]);

  const byId = new Map(categories.map((c) => [c.id, c]));
  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    const key = c.parentId ?? "ROOT";
    const list = childrenByParent.get(key) ?? [];
    list.push(c.id);
    childrenByParent.set(key, list);
  }
  for (const [key, list] of childrenByParent.entries()) {
    list.sort((a, b) => (byId.get(a)?.name ?? "").localeCompare(byId.get(b)?.name ?? ""));
    childrenByParent.set(key, list);
  }

  const directCountMap = new Map<string, number>(
    productCounts.map((row) => [row.categoryId, row._count._all])
  );

  const totalCountMemo = new Map<string, number>();
  const totalCountFor = (id: string): number => {
    const cached = totalCountMemo.get(id);
    if (cached !== undefined) return cached;
    const direct = directCountMap.get(id) ?? 0;
    const children = childrenByParent.get(id) ?? [];
    const total = direct + children.reduce((sum, childId) => sum + totalCountFor(childId), 0);
    totalCountMemo.set(id, total);
    return total;
  };

  const buildPathLabel = (id: string) => {
    const names: string[] = [];
    let cur: string | null | undefined = id;
    while (cur) {
      const c = byId.get(cur);
      if (!c) break;
      names.push(c.name);
      cur = c.parentId;
    }
    return names.reverse().join(" › ");
  };

  const queryLower = query.toLowerCase();
  const visible = new Set<string>();
  if (queryLower) {
    for (const c of categories) {
      if (c.name.toLowerCase().includes(queryLower)) {
        let cur: string | null | undefined = c.id;
        while (cur) {
          visible.add(cur);
          cur = byId.get(cur)?.parentId;
        }
      }
    }
  }

  const rows: Array<{
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
  }> = [];

  const walk = (parentKey: string, depth: number) => {
    const childIds = childrenByParent.get(parentKey) ?? [];
    for (const id of childIds) {
      if (queryLower && !visible.has(id)) continue;
      const c = byId.get(id);
      if (!c) continue;
      rows.push({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        parentId: c.parentId ?? null,
        isActive: c.isActive,
        depth,
        pathLabel: buildPathLabel(c.id),
        directCount: directCountMap.get(c.id) ?? 0,
        totalCount: totalCountFor(c.id),
        childrenCount: (childrenByParent.get(c.id) ?? []).length,
      });
      walk(c.id, depth + 1);
    }
  };
  walk("ROOT", 0);

  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.isActive).length;
  const rootCategories = categories.filter((c) => !c.parentId).length;
  const leafCategories = categories.filter((c) => (childrenByParent.get(c.id) ?? []).length === 0).length;

  const parentOptions = categories
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, label: buildPathLabel(c.id) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const withParams = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    Object.entries(params).forEach(([k, v]) => {
      if (!v) return;
      sp.set(k, v);
    });
    const qs = sp.toString();
    return qs ? `/admin/categories?${qs}` : "/admin/categories";
  };

  const editCategory = editId
    ? await prisma.category.findUnique({
        where: { id: editId },
        select: { id: true, name: true, description: true, isActive: true },
      })
    : null;

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <h1 className={styles.pageTitle}>Categorias</h1>
        <div className={layoutStyles.kpiBar}>
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{totalCategories}</span>
            <span className={layoutStyles.kpiLabel}>categorias</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={`${layoutStyles.kpiItem} ${layoutStyles.kpiSuccess}`}>
            <span className={layoutStyles.kpiValue}>{activeCategories}</span>
            <span className={layoutStyles.kpiLabel}>ativas</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{rootCategories}</span>
            <span className={layoutStyles.kpiLabel}>raiz</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{leafCategories}</span>
            <span className={layoutStyles.kpiLabel}>folhas</span>
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <CategoriesFilters
          initialQuery={query}
          error={error}
          openModalOnLoad={openModal}
          initialParentId={parentIdParam}
          parentOptions={parentOptions}
        />
        {error === "nome" && !openModal ? (
          <p className={styles.textError}>Informe o nome da categoria.</p>
        ) : error === "duplicado" && !openModal ? (
          <p className={styles.textError}>
            Já existe uma categoria com esse nome nesse nível.
          </p>
        ) : error === "pai_inativo" && !openModal ? (
          <p className={styles.textError}>
            Não é possível ativar: a categoria pai está inativa.
          </p>
        ) : null}

        {rows.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIcon}>🏷️</div>
            <div className={layoutStyles.emptyStateTitle}>
              Nenhuma categoria encontrada
            </div>
            <div className={layoutStyles.emptyStateText}>
              Tente ajustar a busca ou crie uma nova categoria.
            </div>
          </div>
        ) : (
          <div className={layoutStyles.tableWrap}>
            <table className={layoutStyles.table}>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Ativo</th>
                  <th className={layoutStyles.colNumeric}>Produtos (direto)</th>
                  <th className={layoutStyles.colNumeric}>Produtos (total)</th>
                  <th className={layoutStyles.colActions}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className={layoutStyles.categoryCell} style={{ ["--depth" as any]: row.depth }}>
                      <span className={layoutStyles.categoryName}>{row.name}</span>
                      {row.depth > 0 ? (
                        <span className={layoutStyles.categoryPath}>{row.pathLabel}</span>
                      ) : null}
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
                      <span className={`${layoutStyles.countBadge} ${row.directCount === 0 ? layoutStyles.countBadgeMuted : ""}`}>
                        {row.directCount}
                      </span>
                    </td>
                    <td className={layoutStyles.colNumeric}>
                      <span className={`${layoutStyles.countBadge} ${row.totalCount === 0 ? layoutStyles.countBadgeMuted : ""}`}>
                        {row.totalCount}
                      </span>
                    </td>
                    <td className={layoutStyles.colActions}>
                      <div className={layoutStyles.inlineActions}>
                        <Link
                          href={withParams({ modal: "1", parentId: row.id })}
                          className={layoutStyles.subAction}
                        >
                          + Subcategoria
                        </Link>
                        <Link
                          href={withParams({ edit: row.id })}
                          className={layoutStyles.actionLink}
                        >
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editCategory ? (
        <div className={layoutStyles.modalOverlay}>
          <div className={layoutStyles.modalCard}>
            <div className={layoutStyles.modalHeader}>
              <h2 className={layoutStyles.modalTitle}>Editar categoria</h2>
              <Link
                href={withParams({})}
                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
              >
                Fechar
              </Link>
            </div>
            <div className={styles.panelBody}>
              <form action={updateCategoryAction} className={styles.formSection}>
                <input type="hidden" name="id" value={editCategory.id} />
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Nome</span>
                  <input
                    name="name"
                    defaultValue={editCategory.name}
                    required
                    className={styles.control}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Descrição</span>
                  <textarea
                    name="description"
                    defaultValue={editCategory.description || ""}
                    placeholder="Descrição (opcional)"
                    className={`${styles.control} ${styles.controlTextarea}`}
                  ></textarea>
                </label>
                <label className={styles.choiceRow}>
                  <input type="checkbox" name="isActive" defaultChecked={editCategory.isActive} />
                  <span className={styles.choiceLabel}>
                    Ativa (alterar aqui afeta também as subcategorias)
                  </span>
                </label>
                <div className={layoutStyles.modalFooter}>
                  <Link
                    href={withParams({})}
                    className={`${styles.button} ${styles.buttonGhost}`}
                  >
                    Cancelar
                  </Link>
                  <button type="submit" className={`${styles.button} ${styles.buttonPrimary}`}>
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
