import { prisma } from "@/lib/prisma";
import { createCategoryAction, updateCategoryAction } from "./actions";

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
    <main style={{ display: "grid", gap: 16 }}>
      <h1>Categorias</h1>

      <form
        style={{ display: "flex", gap: 12, alignItems: "center" }}
        action=""
      >
        <input
          type="text"
          name="q"
          placeholder="Buscar por nome"
          defaultValue={query}
        />
        <button type="submit">Buscar</button>
      </form>

      {error === "nome" ? (
        <p style={{ color: "crimson" }}>Informe o nome da categoria.</p>
      ) : null}

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Nova categoria</h2>
        <form action={createCategoryAction} style={{ display: "grid", gap: 8 }}>
          <input name="name" placeholder="Nome" required />
          <textarea
            name="description"
            placeholder="Descricao (opcional)"
          ></textarea>
          <label>
            <input type="checkbox" name="isActive" defaultChecked /> Ativa
          </label>
          <button type="submit">Criar categoria</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Lista</h2>
        {categories.length === 0 ? (
          <p>Nenhuma categoria cadastrada.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #eee",
            }}
          >
            <thead>
              <tr style={{ background: "#f7f7f7" }}>
                <th style={{ textAlign: "left", padding: 8 }}>Nome</th>
                <th style={{ textAlign: "left", padding: 8 }}>Descricao</th>
                <th style={{ textAlign: "left", padding: 8 }}>Ativo</th>
                <th style={{ textAlign: "left", padding: 8 }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    <input
                      form={`category-form-${category.id}`}
                      name="name"
                      defaultValue={category.name}
                      required
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <textarea
                      form={`category-form-${category.id}`}
                      name="description"
                      defaultValue={category.description || ""}
                      placeholder="Descricao"
                    ></textarea>
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      form={`category-form-${category.id}`}
                      type="checkbox"
                      name="isActive"
                      defaultChecked={category.isActive}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <form
                      id={`category-form-${category.id}`}
                      action={updateCategoryAction}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input type="hidden" name="id" value={category.id} />
                      <button type="submit">Salvar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
