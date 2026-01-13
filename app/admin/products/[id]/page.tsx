import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createSkuAction,
  duplicateSkuAction,
  updateProductAction,
  updateSkuAction,
} from "./actions";

type ProductSearchParams = {
  error?: string;
};

const unitTypeOptions = [
  { value: "UNIDADE", label: "UNIDADE" },
  { value: "CENTO", label: "CENTO" },
  { value: "KG", label: "KG" },
];

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<ProductSearchParams> | ProductSearchParams;
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const productId = p?.id;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: true,
      skus: {
        include: {
          tags: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) {
    return (
      <main>
        <p>Produto nao encontrado.</p>
        <Link href="/admin/products">Voltar</Link>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const imageExtraUrls = product.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => img.url)
    .join("\n");

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Produto: {product.name}</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>

      {sp?.error === "campos" ? (
        <p style={{ color: "crimson" }}>
          Preencha nome e categoria para salvar.
        </p>
      ) : null}
      {sp?.error === "sku_campos" ? (
        <p style={{ color: "crimson" }}>
          Preencha nome, tamanho, tipo de venda, passo, minimo e preco.
        </p>
      ) : null}
      {sp?.error === "sku_unit" ? (
        <p style={{ color: "crimson" }}>
          Tipo de venda e label de unidade incoerentes.
        </p>
      ) : null}
      {sp?.error === "sku_quantidade" ? (
        <p style={{ color: "crimson" }}>
          Passo/minimo invalidos para o tipo de venda.
        </p>
      ) : null}

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Editar produto</h2>
        <form action={updateProductAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="id" value={product.id} />
          <input name="name" defaultValue={product.name} required />
          <select name="categoryId" defaultValue={product.categoryId} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <textarea
            name="descriptionLong"
            defaultValue={product.descriptionLong || ""}
            placeholder="Descricao longa"
          ></textarea>
          <input
            type="number"
            name="leadTime"
            defaultValue={product.leadTime ?? ""}
            placeholder="Lead time (horas)"
            min="0"
            step="1"
          />
          <label>
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={product.isActive}
            />{" "}
            Ativo
          </label>
          <label>
            <input
              type="checkbox"
              name="isPublicHidden"
              defaultChecked={product.isPublicHidden}
            />{" "}
            Ocultar do publico
          </label>
          <label>
            <input
              type="checkbox"
              name="sobConsulta"
              defaultChecked={product.sobConsulta}
            />{" "}
            Sob consulta
          </label>
          <input
            name="imageMainUrl"
            defaultValue={product.imageMainUrl || ""}
            placeholder="URL da imagem principal"
          />
          <textarea
            name="imageExtraUrls"
            defaultValue={imageExtraUrls}
            placeholder="URLs extras (uma por linha)"
          ></textarea>
          <button type="submit">Salvar produto</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Novo SKU</h2>
        <form action={createSkuAction} style={{ display: "grid", gap: 8 }}>
          <input type="hidden" name="productId" value={product.id} />
          <input name="displayName" placeholder="Nome exibido" required />
          <input name="sizeText" placeholder="Tamanho" required />
          <input name="flavorText" placeholder="Sabor (opcional)" />
          <label>
            <input type="checkbox" name="isFrozen" /> Congelado
          </label>
          <label>
            Tipo de venda
            <select name="unitType" defaultValue="UNIDADE">
              {unitTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <input name="unitLabel" placeholder="un/cento/kg/kit" required />
          <label>
            Passo de quantidade
            <input type="number" name="quantityStep" step="0.1" required />
          </label>
          <label>
            Minimo
            <input type="number" name="minQty" step="0.1" required />
          </label>
          <label>
            Preco atual
            <input type="number" name="priceCurrent" step="0.01" required />
          </label>
          <label>
            Custo (opcional)
            <input type="number" name="cost" step="0.01" />
          </label>
          <label>
            Tags (separadas por virgula)
            <input name="tags" placeholder="salgado, festa" />
          </label>
          <label>
            Sob consulta
            <select name="sobConsultaOverride" defaultValue="inherit">
              <option value="inherit">Herdar do produto</option>
              <option value="true">Forcar sob consulta</option>
              <option value="false">Forcar nao</option>
            </select>
          </label>
          <label>
            <input type="checkbox" name="isActive" defaultChecked /> Ativo
          </label>
          <button type="submit">Criar SKU</button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>SKUs</h2>
        {product.skus.length === 0 ? (
          <p>Nenhum SKU cadastrado.</p>
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
                <th style={{ padding: 8, textAlign: "left" }}>Nome</th>
                <th style={{ padding: 8, textAlign: "left" }}>Tamanho</th>
                <th style={{ padding: 8, textAlign: "left" }}>Tipo</th>
                <th style={{ padding: 8, textAlign: "left" }}>Status</th>
                <th style={{ padding: 8, textAlign: "left" }}>Sob consulta</th>
                <th style={{ padding: 8, textAlign: "left" }}>Preco</th>
                <th style={{ padding: 8, textAlign: "left" }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {product.skus.map((sku) => (
                <tr key={sku.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    <form
                      action={updateSkuAction}
                      style={{ display: "grid", gap: 6 }}
                    >
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="skuId" value={sku.id} />
                      <input
                        name="displayName"
                        defaultValue={sku.displayName}
                        required
                      />
                      <input
                        name="sizeText"
                        defaultValue={sku.sizeText}
                        required
                      />
                      <input
                        name="flavorText"
                        defaultValue={sku.flavorText || ""}
                        placeholder="Sabor"
                      />
                      <label>
                        <input
                          type="checkbox"
                          name="isFrozen"
                          defaultChecked={sku.isFrozen}
                        />{" "}
                        Congelado
                      </label>
                      <label>
                        Tipo de venda
                        <select name="unitType" defaultValue={sku.unitType}>
                          {unitTypeOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <input
                        name="unitLabel"
                        defaultValue={sku.unitLabel}
                        placeholder="un/cento/kg/kit"
                        required
                      />
                      <label>
                        Passo de quantidade
                        <input
                          type="number"
                          name="quantityStep"
                          step="0.1"
                          defaultValue={Number(sku.quantityStep)}
                          required
                        />
                      </label>
                      <label>
                        Minimo
                        <input
                          type="number"
                          name="minQty"
                          step="0.1"
                          defaultValue={Number(sku.minQty)}
                          required
                        />
                      </label>
                      <label>
                        Preco atual
                        <input
                          type="number"
                          name="priceCurrent"
                          step="0.01"
                          defaultValue={Number(sku.priceCurrent)}
                          required
                        />
                      </label>
                      <label>
                        Custo (opcional)
                        <input
                          type="number"
                          name="cost"
                          step="0.01"
                          defaultValue={sku.cost ? Number(sku.cost) : ""}
                        />
                      </label>
                      <label>
                        Tags (separadas por virgula)
                        <input
                          name="tags"
                          defaultValue={sku.tags.map((tag) => tag.name).join(", ")}
                        />
                      </label>
                      <label>
                        Sob consulta
                        <select
                          name="sobConsultaOverride"
                          defaultValue={
                            sku.sobConsultaOverride === true
                              ? "true"
                              : sku.sobConsultaOverride === false
                              ? "false"
                              : "inherit"
                          }
                        >
                          <option value="inherit">Herdar do produto</option>
                          <option value="true">Forcar sob consulta</option>
                          <option value="false">Forcar nao</option>
                        </select>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked={sku.isActive}
                        />{" "}
                        Ativo
                      </label>
                      <button type="submit">Salvar SKU</button>
                    </form>
                  </td>
                  <td style={{ padding: 8 }}>{sku.sizeText}</td>
                  <td style={{ padding: 8 }}>
                    {sku.unitType} ({sku.unitLabel})
                  </td>
                  <td style={{ padding: 8 }}>
                    {sku.isActive ? "ATIVO" : "INATIVO"}
                  </td>
                  <td style={{ padding: 8 }}>
                    {sku.sobConsultaOverride === true
                      ? "SIM"
                      : sku.sobConsultaOverride === false
                      ? "NAO"
                      : product.sobConsulta
                      ? "SIM"
                      : "NAO"}
                  </td>
                  <td style={{ padding: 8 }}>
                    R$ {Number(sku.priceCurrent).toFixed(2)}
                  </td>
                  <td style={{ padding: 8 }}>
                    <form action={duplicateSkuAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <input type="hidden" name="skuId" value={sku.id} />
                      <button type="submit">Duplicar</button>
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
