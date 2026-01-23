import { prisma } from "@/lib/prisma";
import CategoriesFilters from "./CategoriesFilters.client";
import CategoriesTreeClient from "./CategoriesTree.client";
import layoutStyles from "./categories.module.css";
import styles from "../_styles/adminPrimitives.module.css";

type CategoriesSearchParams = {
  q?: string;
  error?: string;
  modal?: string;
  parentId?: string;
  notice?: string;
  active?: string; // all | active | inactive
  kind?: string; // all | root | leaf
  has?: string; // all | direct | any
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
  const notice = (sp?.notice ?? "").trim();
  const activeParam = (sp?.active ?? "all").trim();
  const kindParam = (sp?.kind ?? "all").trim();
  const hasParam = (sp?.has ?? "all").trim();

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

  const descendantCountMemo = new Map<string, number>();
  const descendantCountFor = (id: string): number => {
    const cached = descendantCountMemo.get(id);
    if (cached !== undefined) return cached;
    const children = childrenByParent.get(id) ?? [];
    const total =
      children.length +
      children.reduce((sum, childId) => sum + descendantCountFor(childId), 0);
    descendantCountMemo.set(id, total);
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
  const hasFiltersActive =
    Boolean(queryLower) ||
    activeParam !== "all" ||
    kindParam !== "all" ||
    hasParam !== "all";
  const visible = new Set<string>();
  if (hasFiltersActive) {
    const matches = (c: (typeof categories)[number]) => {
      const queryOk = queryLower ? c.name.toLowerCase().includes(queryLower) : true;
      const activeOk =
        activeParam === "all"
          ? true
          : activeParam === "active"
          ? c.isActive
          : activeParam === "inactive"
          ? !c.isActive
          : true;
      const childCount = (childrenByParent.get(c.id) ?? []).length;
      const kindOk =
        kindParam === "all"
          ? true
          : kindParam === "root"
          ? !c.parentId
          : kindParam === "leaf"
          ? childCount === 0
          : true;
      const direct = directCountMap.get(c.id) ?? 0;
      const total = totalCountFor(c.id);
      const hasOk =
        hasParam === "all"
          ? true
          : hasParam === "direct"
          ? direct > 0
          : hasParam === "any"
          ? total > 0
          : true;
      return queryOk && activeOk && kindOk && hasOk;
    };

    for (const c of categories) {
      if (!matches(c)) continue;
      let cur: string | null | undefined = c.id;
      while (cur) {
        visible.add(cur);
        cur = byId.get(cur)?.parentId;
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
    descendantCount: number;
  }> = [];

  const walk = (parentKey: string, depth: number) => {
    const childIds = childrenByParent.get(parentKey) ?? [];
    for (const id of childIds) {
      if (hasFiltersActive && !visible.has(id)) continue;
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
        descendantCount: descendantCountFor(c.id),
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
          initialActive={activeParam}
          initialKind={kindParam}
          initialHas={hasParam}
        />

        {notice === "created" ? (
          <div className={`${styles.notice} ${styles.noticeSuccess}`}>
            Categoria criada com sucesso.
          </div>
        ) : notice === "updated" ? (
          <div className={`${styles.notice} ${styles.noticeSuccess}`}>
            Categoria atualizada com sucesso.
          </div>
        ) : null}

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
          <CategoriesTreeClient rows={rows} />
        )}
      </section>
    </main>
  );
}
