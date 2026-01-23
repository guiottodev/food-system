import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";
import ProductsFilters from "./ProductsFilters.client";

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
    orderBy: { name: "asc" },
  });

  const where = {
    ...(query
      ? {
          name: {
            contains: query,
          },
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
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

  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>Produtos</h1>
      <section className={styles.panel}>
        <ProductsFilters
          categories={categories}
          initialQuery={query}
          initialCategoryId={categoryId}
          initialActive={activeFilter}
        />

        {products.length === 0 ? (
          <div className={styles.emptyState}>Nenhum produto encontrado.</div>
        ) : (
          <div className={layoutStyles.tableWrap}>
            <table className={layoutStyles.table}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th className={styles.tableNumeric}>SKUs</th>
                  <th className={styles.tableActions}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const activeSkus = product.skus.filter((sku) => sku.isActive).length;
                  const totalSkus = product.skus.length;
                  return (
                  <tr key={product.id}>
                    <td>
                      <div className={layoutStyles.productCell}>
                        <strong>{product.name}</strong>
                        <div className={layoutStyles.productMeta}>
                          <span
                            className={`${styles.badge} ${
                              product.isActive
                                ? styles.badgeSuccess
                                : styles.badgeNeutral
                            }`}
                          >
                            {product.isActive ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category.name}</td>
                    <td className={styles.tableNumeric}>
                      <div className={layoutStyles.skuCount}>
                        {activeSkus} ativos / {totalSkus} total
                        {activeSkus === 0 ? (
                          <span className={`${styles.badge} ${styles.badgeWarning}`}>
                            Sem SKU
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className={styles.tableActions}>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
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
