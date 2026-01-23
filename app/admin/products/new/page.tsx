import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProductAction } from "../actions";
import styles from "../../_styles/adminPrimitives.module.css";

type ProductsNewSearchParams = {
  error?: string;
};

export default async function ProductsNewPage({
  searchParams,
}: {
  searchParams?: Promise<ProductsNewSearchParams> | ProductsNewSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Novo produto</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>

      {sp?.error === "campos" ? (
        <p className={styles.textError}>
          Informe nome e categoria para criar o produto.
        </p>
      ) : sp?.error === "sku_campos" ? (
        <p className={styles.textError}>
          Informe nome, tipo de venda e preco do primeiro SKU.
        </p>
      ) : sp?.error === "sku_preco" ? (
        <p className={styles.textError}>
          Informe um preco valido para o primeiro SKU.
        </p>
      ) : sp?.error === "sku_unit" ? (
        <p className={styles.textError}>
          Tipo de venda invalido para o primeiro SKU.
        </p>
      ) : null}

      <form action={createProductAction} className={styles.stackMd}>
        <section className={`${styles.panel} ${styles.panelPrimary}`}>
          <div className={styles.panelHeader}>
            <h2>Essencial</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Nome</span>
                <input
                  name="name"
                  placeholder="Nome do produto"
                  required
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Categoria</span>
                <select name="categoryId" required className={styles.control}>
                  <option value="">Selecione a categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className={styles.choiceRow}>
              <input type="checkbox" name="isActive" defaultChecked />
              <span className={styles.choiceLabel}>Ativo</span>
            </label>
            <p className={styles.textMuted}>
              Cadastre o primeiro SKU agora (obrigatorio para vender).
            </p>
          </div>
        </section>

        <section className={`${styles.panel} ${styles.panelSecondary}`}>
          <div className={styles.panelHeader}>
            <h2>Primeiro SKU (obrigatorio)</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.fieldLabel}>Nome exibido</span>
                <input
                  name="skuDisplayName"
                  placeholder="Nome do SKU"
                  required
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Tipo de venda</span>
                <select name="skuUnitType" required className={styles.control}>
                  <option value="UNIDADE">UNIDADE</option>
                  <option value="CENTO">CENTO</option>
                  <option value="KG">KG</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Preco atual</span>
                <input
                  name="skuPriceCurrent"
                  placeholder="0,00"
                  inputMode="decimal"
                  required
                  className={styles.control}
                />
              </label>
            </div>
            <label className={styles.choiceRow}>
              <input type="checkbox" name="skuIsActive" defaultChecked />
              <span className={styles.choiceLabel}>Ativo</span>
            </label>
            <p className={styles.textMuted}>
              Voce podera editar mais detalhes do SKU depois de criar o produto.
            </p>
          </div>
        </section>

        <div className={styles.panelFooter}>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
          >
            Criar produto
          </button>
        </div>
      </form>
    </main>
  );
}
