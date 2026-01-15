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
      ) : null}

      <section className={`${styles.panel} ${styles.panelPrimary}`}>
        <div className={styles.panelHeader}>
          <h2>Cadastro</h2>
        </div>
        <div className={styles.panelBody}>
          <form action={createProductAction} className={styles.formSection}>
            <input
              name="name"
              placeholder="Nome do produto"
              required
              className={styles.control}
            />
            <select name="categoryId" required className={styles.control}>
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
              className={`${styles.control} ${styles.controlTextarea}`}
            ></textarea>
            <input
              type="number"
              name="leadTime"
              placeholder="Lead time (horas)"
              min="0"
              step="1"
              className={styles.control}
            />
            <label className={styles.choiceRow}>
              <input type="checkbox" name="isActive" defaultChecked />
              <span className={styles.choiceLabel}>Ativo</span>
            </label>
            <label className={styles.choiceRow}>
              <input type="checkbox" name="isPublicHidden" />
              <span className={styles.choiceLabel}>Ocultar do publico</span>
            </label>
            <label className={styles.choiceRow}>
              <input type="checkbox" name="sobConsulta" />
              <span className={styles.choiceLabel}>Sob consulta</span>
            </label>
            <input
              name="imageMainUrl"
              placeholder="URL da imagem principal"
              className={styles.control}
            />
            <textarea
              name="imageExtraUrls"
              placeholder="URLs extras (uma por linha)"
              className={`${styles.control} ${styles.controlTextarea}`}
            ></textarea>
            <div className={styles.panelFooter}>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Criar produto
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
