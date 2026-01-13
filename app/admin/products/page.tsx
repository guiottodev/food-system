import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProductAction } from "./actions";

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
    <main style={{ display: "grid", gap: 16 }}>
      <h1>Produtos</h1>

      {sp?.error === "campos" ? (
        <p style={{ color: "crimson" }}>
          Informe nome e categoria para criar o produto.
        </p>
      ) : null}

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Novo produto</h2>
        <form action={createProductAction} style={{ display: "grid", gap: 8 }}>
          <input name="name" placeholder="Nome do produto" required />
          <select name="categoryId" required>
            <option value="">Selecione a categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <textarea
            name="descriptionLong"
            placeholder="Descricao longa (opcional)"
          ></textarea>
          <input
            type="number"
            name="leadTime"
            placeholder="Lead time (horas)"
            min="0"
            step="1"
          />
          <label>
            <input type="checkbox" name="isActive" defaultChecked /> Ativo
          </label>
          <label>
            <input type="checkbox" name="isPublicHidden" /> Ocultar do publico
          </label>
          <label>
            <input type="checkbox" name="sobConsulta" /> Sob consulta
          </label>
          <input
            name="imageMainUrl"
            placeholder="URL da imagem principal"
          />
          <textarea
            name="imageExtraUrls"
            placeholder="URLs extras (uma por linha)"
          ></textarea>
          <button type="submit">Criar produto</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Filtros</h2>
        <form
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px 160px 160px 160px 120px",
            gap: 12,
          }}
        >
          <input
            type="text"
            name="q"
            placeholder="Buscar por nome"
            defaultValue={query}
          />
          <select name="categoryId" defaultValue={categoryId}>
            <option value="">Todas categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select name="active" defaultValue={activeFilter}>
            <option value="all">Ativos e inativos</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>
          <select name="hidden" defaultValue={hiddenFilter}>
            <option value="all">Publico e oculto</option>
            <option value="public">Somente publico</option>
            <option value="hidden">Somente oculto</option>
          </select>
          <select name="sob" defaultValue={sobFilter}>
            <option value="all">Com ou sem sob consulta</option>
            <option value="yes">Somente sob consulta</option>
            <option value="no">Sem sob consulta</option>
          </select>
          <button type="submit">Aplicar</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Lista</h2>
        {products.length === 0 ? (
          <p>Nenhum produto encontrado.</p>
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
                <th style={{ padding: 8, textAlign: "left" }}>Produto</th>
                <th style={{ padding: 8, textAlign: "left" }}>Categoria</th>
                <th style={{ padding: 8, textAlign: "left" }}>Status</th>
                <th style={{ padding: 8, textAlign: "left" }}>Sob consulta</th>
                <th style={{ padding: 8, textAlign: "left" }}>SKUs</th>
                <th style={{ padding: 8, textAlign: "left" }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{product.name}</td>
                  <td style={{ padding: 8 }}>{product.category.name}</td>
                  <td style={{ padding: 8 }}>
                    {product.isActive ? "Ativo" : "Inativo"}
                  </td>
                  <td style={{ padding: 8 }}>
                    {product.sobConsulta ? "Sim" : "Nao"}
                  </td>
                  <td style={{ padding: 8 }}>{product._count.skus}</td>
                  <td style={{ padding: 8 }}>
                    <Link href={`/admin/products/${product.id}`}>
                      Ver detalhes
                    </Link>
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
