import Link from "next/link";
import ProductionSessionForm from "./ProductionSessionForm.client";
import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./producao.module.css";

type SearchParams = {
  error?: string;
  created?: string;
  productId?: string;
};

export default async function ProducaoPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const errorCode = sp?.error ?? "";
  const created = sp?.created === "1";
  const productId = (sp?.productId ?? "").trim();

  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <h1 className={styles.pageTitle}>Registrar Produção</h1>
        <Link href="/admin/capacidade" className={layoutStyles.linkButton}>
          Ver produção
        </Link>
      </div>

      <section className={styles.panel}>
        <ProductionSessionForm
          errorCode={errorCode}
          created={created}
          initialProductId={productId || undefined}
        />
      </section>
    </main>
  );
}
