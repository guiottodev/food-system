import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import styles from "../_styles/adminPrimitives.module.css";

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
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Produtos</h1>
        <Link
          href="/admin/products/new"
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Novo produto
        </Link>
      </div>

      <section className={`${styles.panel} ${styles.panelSecondary}`}>
        <div className={styles.panelHeader}>
          <h2>Filtros</h2>
        </div>
        <div className={styles.panelBody}>
          <form className={styles.toolbar}>
            <div className={styles.toolbarGroup}>
              <input
                type="text"
                name="q"
                placeholder="Buscar por nome"
                defaultValue={query}
                className={styles.control}
              />
              <select
                name="categoryId"
                defaultValue={categoryId}
                className={styles.control}
              >
                <option value="">Todas categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                name="active"
                defaultValue={activeFilter}
                className={styles.control}
              >
                <option value="all">Ativos e inativos</option>
                <option value="active">Somente ativos</option>
                <option value="inactive">Somente inativos</option>
              </select>
              <select
                name="hidden"
                defaultValue={hiddenFilter}
                className={styles.control}
              >
                <option value="all">Publico e oculto</option>
                <option value="public">Somente publico</option>
                <option value="hidden">Somente oculto</option>
              </select>
              <select
                name="sob"
                defaultValue={sobFilter}
                className={styles.control}
              >
                <option value="all">Com ou sem sob consulta</option>
                <option value="yes">Somente sob consulta</option>
                <option value="no">Sem sob consulta</option>
              </select>
            </div>
            <div className={styles.toolbarActions}>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonSecondary}`}
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.panelSecondary}`}>
        <div className={styles.panelHeader}>
          <h2>Lista</h2>
        </div>
        {products.length === 0 ? (
          <div className={styles.emptyState}>Nenhum produto encontrado.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
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
