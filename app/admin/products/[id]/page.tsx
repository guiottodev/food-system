import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createSkuAction,
  duplicateSkuAction,
  updateProductAction,
  updateSkuAction,
} from "./actions";
import styles from "../../_styles/adminPrimitives.module.css";

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
      <main className={`${styles.page} ${styles.stackSm}`}>
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
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Produto: {product.name}</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>

      {sp?.error === "campos" ? (
        <p className={styles.textError}>
          Preencha nome e categoria para salvar.
        </p>
      ) : null}
      {sp?.error === "sku_campos" ? (
        <p className={styles.textError}>
          Preencha nome, tamanho, tipo de venda, passo, minimo e preco.
        </p>
      ) : null}
      {sp?.error === "sku_unit" ? (
        <p className={styles.textError}>
          Tipo de venda e label de unidade incoerentes.
        </p>
      ) : null}
      {sp?.error === "sku_quantidade" ? (
        <p className={styles.textError}>
          Passo/minimo invalidos para o tipo de venda.
        </p>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Editar produto</h2>
        </div>
        <div className={styles.panelBody}>
          <form action={updateProductAction} className={styles.formGrid}>
            <input type="hidden" name="id" value={product.id} />
            <input
              name="name"
              defaultValue={product.name}
              required
              className={styles.control}
            />
            <select
              name="categoryId"
              defaultValue={product.categoryId}
              required
              className={styles.control}
            >
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
              className={`${styles.control} ${styles.controlTextarea} ${styles.fieldFull}`}
            ></textarea>
            <input
              type="number"
              name="leadTime"
              defaultValue={product.leadTime ?? ""}
              placeholder="Lead time (horas)"
              min="0"
              step="1"
              className={styles.control}
            />
            <label className={styles.choiceRow}>
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={product.isActive}
              />
              <span className={styles.choiceLabel}>Ativo</span>
            </label>
            <label className={styles.choiceRow}>
              <input
                type="checkbox"
                name="isPublicHidden"
                defaultChecked={product.isPublicHidden}
              />
              <span className={styles.choiceLabel}>Ocultar do publico</span>
            </label>
            <label className={styles.choiceRow}>
              <input
                type="checkbox"
                name="sobConsulta"
                defaultChecked={product.sobConsulta}
              />
              <span className={styles.choiceLabel}>Sob consulta</span>
            </label>
            <input
              name="imageMainUrl"
              defaultValue={product.imageMainUrl || ""}
              placeholder="URL da imagem principal"
              className={`${styles.control} ${styles.fieldFull}`}
            />
            <textarea
              name="imageExtraUrls"
              defaultValue={imageExtraUrls}
              placeholder="URLs extras (uma por linha)"
              className={`${styles.control} ${styles.controlTextarea} ${styles.fieldFull}`}
            ></textarea>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Salvar produto
            </button>
          </form>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Novo SKU</h2>
        </div>
        <div className={styles.panelBody}>
          <form action={createSkuAction} className={styles.formGrid}>
            <input type="hidden" name="productId" value={product.id} />
            <input
              name="displayName"
              placeholder="Nome exibido"
              required
              className={`${styles.control} ${styles.fieldFull}`}
            />
            <input
              name="sizeText"
              placeholder="Tamanho"
              required
              className={styles.control}
            />
            <input
              name="flavorText"
              placeholder="Sabor (opcional)"
              className={styles.control}
            />
            <label className={styles.choiceRow}>
              <input type="checkbox" name="isFrozen" />
              <span className={styles.choiceLabel}>Congelado</span>
            </label>
            <label className={styles.field}>
              Tipo de venda
              <select
                name="unitType"
                defaultValue="UNIDADE"
                className={styles.control}
              >
                {unitTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              name="unitLabel"
              placeholder="un/cento/kg/kit"
              required
              className={styles.control}
            />
            <label className={styles.field}>
              Passo de quantidade
              <input
                type="number"
                name="quantityStep"
                step="0.1"
                required
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              Minimo
              <input
                type="number"
                name="minQty"
                step="0.1"
                required
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              Preco atual
              <input
                type="number"
                name="priceCurrent"
                step="0.01"
                required
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              Custo (opcional)
              <input
                type="number"
                name="cost"
                step="0.01"
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              Tags (separadas por virgula)
              <input
                name="tags"
                placeholder="salgado, festa"
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              Sob consulta
              <select
                name="sobConsultaOverride"
                defaultValue="inherit"
                className={styles.control}
              >
                <option value="inherit">Herdar do produto</option>
                <option value="true">Forcar sob consulta</option>
                <option value="false">Forcar nao</option>
              </select>
            </label>
            <label className={styles.choiceRow}>
              <input type="checkbox" name="isActive" defaultChecked />
              <span className={styles.choiceLabel}>Ativo</span>
            </label>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Criar SKU
            </button>
          </form>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>SKUs</h2>
        </div>
        {product.skus.length === 0 ? (
          <div className={styles.emptyState}>Nenhum SKU cadastrado.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tamanho</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Sob consulta</th>
                  <th className={styles.tableNumeric}>Preco</th>
                  <th className={styles.tableActions}>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {product.skus.map((sku) => (
                  <tr key={sku.id}>
                    <td>
                      <form action={updateSkuAction} className={styles.stackSm}>
                        <input
                          type="hidden"
                          name="productId"
                          value={product.id}
                        />
                        <input type="hidden" name="skuId" value={sku.id} />
                        <input
                          name="displayName"
                          defaultValue={sku.displayName}
                          required
                          className={styles.control}
                        />
                        <input
                          name="sizeText"
                          defaultValue={sku.sizeText}
                          required
                          className={styles.control}
                        />
                        <input
                          name="flavorText"
                          defaultValue={sku.flavorText || ""}
                          placeholder="Sabor"
                          className={styles.control}
                        />
                        <label className={styles.choiceRow}>
                          <input
                            type="checkbox"
                            name="isFrozen"
                            defaultChecked={sku.isFrozen}
                          />
                          <span className={styles.choiceLabel}>Congelado</span>
                        </label>
                        <label className={styles.field}>
                          Tipo de venda
                          <select
                            name="unitType"
                            defaultValue={sku.unitType}
                            className={styles.control}
                          >
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
                          className={styles.control}
                        />
                        <label className={styles.field}>
                          Passo de quantidade
                          <input
                            type="number"
                            name="quantityStep"
                            step="0.1"
                            defaultValue={Number(sku.quantityStep)}
                            required
                            className={styles.control}
                          />
                        </label>
                        <label className={styles.field}>
                          Minimo
                          <input
                            type="number"
                            name="minQty"
                            step="0.1"
                            defaultValue={Number(sku.minQty)}
                            required
                            className={styles.control}
                          />
                        </label>
                        <label className={styles.field}>
                          Preco atual
                          <input
                            type="number"
                            name="priceCurrent"
                            step="0.01"
                            defaultValue={Number(sku.priceCurrent)}
                            required
                            className={styles.control}
                          />
                        </label>
                        <label className={styles.field}>
                          Custo (opcional)
                          <input
                            type="number"
                            name="cost"
                            step="0.01"
                            defaultValue={sku.cost ? Number(sku.cost) : ""}
                            className={styles.control}
                          />
                        </label>
                        <label className={styles.field}>
                          Tags (separadas por virgula)
                          <input
                            name="tags"
                            defaultValue={sku.tags
                              .map((tag) => tag.name)
                              .join(", ")}
                            className={styles.control}
                          />
                        </label>
                        <label className={styles.field}>
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
                            className={styles.control}
                          >
                            <option value="inherit">Herdar do produto</option>
                            <option value="true">Forcar sob consulta</option>
                            <option value="false">Forcar nao</option>
                          </select>
                        </label>
                        <label className={styles.choiceRow}>
                          <input
                            type="checkbox"
                            name="isActive"
                            defaultChecked={sku.isActive}
                          />
                          <span className={styles.choiceLabel}>Ativo</span>
                        </label>
                        <button
                          type="submit"
                          className={`${styles.button} ${styles.buttonSecondary}`}
                        >
                          Salvar SKU
                        </button>
                      </form>
                    </td>
                    <td>{sku.sizeText}</td>
                    <td>
                      {sku.unitType} ({sku.unitLabel})
                    </td>
                    <td>{sku.isActive ? "ATIVO" : "INATIVO"}</td>
                    <td>
                      {sku.sobConsultaOverride === true
                        ? "SIM"
                        : sku.sobConsultaOverride === false
                        ? "NAO"
                        : product.sobConsulta
                        ? "SIM"
                        : "NAO"}
                    </td>
                    <td className={styles.tableNumeric}>
                      R$ {Number(sku.priceCurrent).toFixed(2)}
                    </td>
                    <td className={styles.tableActions}>
                      <form action={duplicateSkuAction}>
                        <input
                          type="hidden"
                          name="productId"
                          value={product.id}
                        />
                        <input type="hidden" name="skuId" value={sku.id} />
                        <button
                          type="submit"
                          className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                        >
                          Duplicar
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
