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
  hidden?: string;
  sob?: string;
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
  const hiddenFilter = parseFilter(sp?.hidden, "all");
  const sobFilter = parseFilter(sp?.sob, "all");

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
    ...(hiddenFilter === "hidden"
      ? { isPublicHidden: true }
      : hiddenFilter === "public"
      ? { isPublicHidden: false }
      : {}),
    ...(sobFilter === "yes"
      ? { sobConsulta: true }
      : sobFilter === "no"
      ? { sobConsulta: false }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      category: true,
      _count: {
        select: { skus: true },
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
          initialHidden={hiddenFilter}
          initialSob={sobFilter}
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
                  <th>Status</th>
                  <th>Sob consulta</th>
                  <th className={styles.tableNumeric}>SKUs</th>
                  <th className={styles.tableActions}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category.name}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          product.isActive
                            ? styles.badgeSuccess
                            : styles.badgeNeutral
                        }`}
                      >
                        {product.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          product.sobConsulta
                            ? styles.badgeWarning
                            : styles.badgeNeutral
                        }`}
                      >
                        {product.sobConsulta ? "Sim" : "Nao"}
                      </span>
                    </td>
                    <td className={styles.tableNumeric}>
                      {product._count.skus}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
