import { prisma } from "@/lib/prisma";
import { updateCategoryAction } from "./actions";
import CategoriesFilters from "./CategoriesFilters.client";
import layoutStyles from "./categories.module.css";
import styles from "../_styles/adminPrimitives.module.css";

type CategoriesSearchParams = {
  q?: string;
  error?: string;
  modal?: string;
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

  const categories = await prisma.category.findMany({
    where: query
      ? {
          name: {
            contains: query,
          },
        }
      : {},
    orderBy: { name: "asc" },
  });

  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>Categorias</h1>
      <section className={styles.panel}>
        <CategoriesFilters
          initialQuery={query}
          error={error}
          openModalOnLoad={openModal}
        />
        {error === "nome" && !openModal ? (
          <p className={styles.textError}>Informe o nome da categoria.</p>
        ) : null}
        {categories.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <div className={layoutStyles.tableWrap}>
            <table className={layoutStyles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descricao</th>
                  <th>Ativo</th>
                  <th className={styles.tableActions}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <input
                        form={`category-form-${category.id}`}
                        name="name"
                        defaultValue={category.name}
                        required
                        className={styles.control}
                      />
                    </td>
                    <td>
                      <textarea
                        form={`category-form-${category.id}`}
                        name="description"
                        defaultValue={category.description || ""}
                        placeholder="Descricao"
                        className={`${styles.control} ${styles.controlTextarea}`}
                      ></textarea>
                    </td>
                    <td>
                      <input
                        form={`category-form-${category.id}`}
                        type="checkbox"
                        name="isActive"
                        defaultChecked={category.isActive}
                      />
                    </td>
                    <td className={styles.tableActions}>
                      <form
                        id={`category-form-${category.id}`}
                        action={updateCategoryAction}
                        className={styles.clusterSm}
                      >
                        <input type="hidden" name="id" value={category.id} />
                        <button
                          type="submit"
                          className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSm}`}
                        >
                          Salvar
                        </button>
                      </form>
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
