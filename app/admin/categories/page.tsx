import { prisma } from "@/lib/prisma";
import { createCategoryAction, updateCategoryAction } from "./actions";
import styles from "../_styles/adminPrimitives.module.css";

type CategoriesSearchParams = {
  q?: string;
  error?: string;
};

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<CategoriesSearchParams> | CategoriesSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const query = (sp?.q ?? "").trim();
  const error = sp?.error;

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
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Categorias</h1>
      </div>

      <form className={styles.toolbar} action="">
        <div className={styles.toolbarGroup}>
          <input
            type="text"
            name="q"
            placeholder="Buscar por nome"
            defaultValue={query}
          />
          <button type="submit">Buscar</button>
        </div>
      </form>

      {error === "nome" ? (
        <p className={styles.textError}>Informe o nome da categoria.</p>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Nova categoria</h2>
        </div>
        <div className={styles.panelBody}>
          <form action={createCategoryAction} className={styles.formSection}>
            <input name="name" placeholder="Nome" required />
            <textarea
              name="description"
              placeholder="Descricao (opcional)"
            ></textarea>
            <label className={styles.clusterSm}>
              <input type="checkbox" name="isActive" defaultChecked /> Ativa
            </label>
            <button type="submit">Criar categoria</button>
          </form>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Lista</h2>
        </div>
        {categories.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
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
                      />
                    </td>
                    <td>
                      <textarea
                        form={`category-form-${category.id}`}
                        name="description"
                        defaultValue={category.description || ""}
                        placeholder="Descricao"
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
                        <button type="submit">Salvar</button>
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
