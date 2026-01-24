import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCategoryIndex, buildCategoryOptions, getDescendantCategoryIds, buildCategoryPathLabel } from "@/lib/domain/categoryHierarchy";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";
import ProductsFilters from "./ProductsFilters.client";
import ProductsTableExpandable from "./ProductsTableExpandable.client";

type ProductsSearchParams = {
  q?: string;
  categoryId?: string;
  active?: string;
  error?: string;
};

function parseFilter(value: string | undefined, defaultValue: string) {
  return value || defaultValue;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<ProductsSearchParams> | ProductsSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  if (sp?.error) {
    const params = new URLSearchParams();
    Object.entries(sp).forEach(([key, value]) => {
      if (!value) return;
      params.set(key, value);
    });
    redirect(`/admin/products/new?${params.toString()}`);
  }
  const query = (sp?.q ?? "").trim();
  const categoryId = sp?.categoryId ?? "";
  const activeFilter = parseFilter(sp?.active, "all");

  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, isActive: true },
  });

  const { byId, childrenByParent } = buildCategoryIndex(categories);
  const categoryFilterIds = categoryId
    ? [categoryId, ...getDescendantCategoryIds(childrenByParent, categoryId)]
    : [];
  const categoryOptions = buildCategoryOptions({
    categories,
    includeInactive: true,
  }).map((c) => ({ id: c.id, label: c.label }));

  const where = {
    ...(query
      ? {
          name: {
            contains: query,
          },
        }
      : {}),
    ...(categoryFilterIds.length ? { categoryId: { in: categoryFilterIds } } : {}),
    ...(activeFilter === "active"
      ? { isActive: true }
      : activeFilter === "inactive"
      ? { isActive: false }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      category: true,
      skus: {
        select: {
          id: true,
          isActive: true,
          displayName: true,
          sizeText: true,
          flavorText: true,
          isFrozen: true,
          unitType: true,
          unitLabel: true,
          priceCurrent: true,
          stockQuantity: true,
        },
        orderBy: { displayName: "asc" },
      },
    },
  });

  const productsForTable = products.map((p) => ({
    id: p.id,
    name: p.name,
    imageMainUrl: p.imageMainUrl,
    isActive: p.isActive,
    categoryLabel: buildCategoryPathLabel(byId, p.categoryId),
    skus: p.skus.map((s) => ({
      id: s.id,
      isActive: s.isActive,
      displayName: s.displayName,
      sizeText: s.sizeText,
      flavorText: s.flavorText,
      isFrozen: s.isFrozen,
      unitType: s.unitType,
      unitLabel: s.unitLabel,
      priceCurrent: Number(s.priceCurrent),
      stockQuantity: Number(s.stockQuantity),
    })),
  }));

  // KPIs
  const activeProducts = products.filter((p) => p.isActive).length;
  const totalSkus = products.reduce((sum, p) => sum + p.skus.length, 0);
  const activeSkusTotal = products.reduce(
    (sum, p) => sum + p.skus.filter((s) => s.isActive).length,
    0
  );

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Produtos</h1>
          <p className={layoutStyles.pageSubtitle}>Gerencie seu catálogo</p>
        </div>
        <div className={layoutStyles.kpiGrid}>
          <div className={layoutStyles.kpiCard}>
            <span className={layoutStyles.kpiValue}>{products.length}</span>
            <span className={layoutStyles.kpiLabel}>produtos</span>
          </div>
          <div className={`${layoutStyles.kpiCard} ${layoutStyles.kpiCardSuccess}`}>
            <span className={layoutStyles.kpiValue}>{activeProducts}</span>
            <span className={layoutStyles.kpiLabel}>ativos</span>
          </div>
          <div className={layoutStyles.kpiCard}>
            <span className={layoutStyles.kpiValue}>{activeSkusTotal} / {totalSkus}</span>
            <span className={layoutStyles.kpiLabel}>SKUs ativos</span>
          </div>
        </div>
      </div>

      <section className={`${styles.panel} ${layoutStyles.productsPanel}`}>
        <ProductsFilters
          categories={categoryOptions}
          initialQuery={query}
          initialCategoryId={categoryId}
          initialActive={activeFilter}
        />

        {products.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIconWrap}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
              </svg>
            </div>
            <div className={layoutStyles.emptyStateTitle}>Nenhum produto encontrado</div>
            <div className={layoutStyles.emptyStateText}>
              Tente ajustar os filtros ou cadastre um novo produto.
            </div>
            <Link href="/admin/products/new" className={`${layoutStyles.primaryButton} ${layoutStyles.emptyStateCta}`}>
              Novo produto
            </Link>
          </div>
        ) : (
          <ProductsTableExpandable products={productsForTable} />
        )}
      </section>
    </main>
  );
}
