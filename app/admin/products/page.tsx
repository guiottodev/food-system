import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildCategoryIndex, buildCategoryOptions, getDescendantCategoryIds, buildCategoryPathLabel } from "@/lib/domain/categoryHierarchy";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";
import ProductsFilters from "./ProductsFilters.client";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
        select: { id: true, isActive: true },
      },
    },
  });

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
        <h1 className={styles.pageTitle}>Produtos</h1>
        <div className={layoutStyles.kpiBar}>
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{products.length}</span>
            <span className={layoutStyles.kpiLabel}>produtos</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={`${layoutStyles.kpiItem} ${layoutStyles.kpiSuccess}`}>
            <span className={layoutStyles.kpiValue}>{activeProducts}</span>
            <span className={layoutStyles.kpiLabel}>ativos</span>
          </div>
          <div className={layoutStyles.kpiDivider} />
          <div className={layoutStyles.kpiItem}>
            <span className={layoutStyles.kpiValue}>{activeSkusTotal}/{totalSkus}</span>
            <span className={layoutStyles.kpiLabel}>SKUs ativos</span>
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <ProductsFilters
          categories={categoryOptions}
          initialQuery={query}
          initialCategoryId={categoryId}
          initialActive={activeFilter}
        />

        {products.length === 0 ? (
          <div className={layoutStyles.emptyState}>
            <div className={layoutStyles.emptyStateIcon}>📦</div>
            <div className={layoutStyles.emptyStateTitle}>Nenhum produto encontrado</div>
            <div className={layoutStyles.emptyStateText}>
              Tente ajustar os filtros ou cadastre um novo produto.
            </div>
            <Link href="/admin/products/new" className={layoutStyles.primaryButton}>
              Novo produto
            </Link>
          </div>
        ) : (
          <div className={layoutStyles.tableContainer}>
            <table className={layoutStyles.productsTable}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th className={layoutStyles.colNumeric}>SKUs</th>
                  <th className={layoutStyles.colActions}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const activeSkus = product.skus.filter((sku) => sku.isActive).length;
                  const totalSkusProduct = product.skus.length;
                  const categoryLabel = buildCategoryPathLabel(byId, product.categoryId);
                  return (
                    <tr key={product.id} className={layoutStyles.tableRow}>
                      <td>
                        <div className={layoutStyles.productCell}>
                          <span className={layoutStyles.productName}>{product.name}</span>
                          <span
                            className={`${layoutStyles.statusBadge} ${
                              product.isActive
                                ? layoutStyles.statusActive
                                : layoutStyles.statusInactive
                            }`}
                          >
                            {product.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={layoutStyles.categoryName}>{categoryLabel}</span>
                      </td>
                      <td className={layoutStyles.colNumeric}>
                        <div className={layoutStyles.skuInfo}>
                          <span className={layoutStyles.skuCount}>
                            {activeSkus} / {totalSkusProduct}
                          </span>
                          {activeSkus === 0 && (
                            <span className={layoutStyles.skuWarning}>Sem SKU ativo</span>
                          )}
                        </div>
                      </td>
                      <td className={layoutStyles.colActions}>
                        <Link
                          href={`/admin/products/${product.id}`}
                          className={layoutStyles.actionLink}
                        >
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
