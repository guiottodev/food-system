import Link from "next/link";
import ProductionSessionForm from "./ProductionSessionForm.client";
import styles from "../_styles/adminPrimitives.module.css";

type SearchParams = {
  error?: string;
  created?: string;
};

export default async function ProducaoPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const errorCode = sp?.error ?? "";
  const created = sp?.created === "1";

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Producao</h1>
        <Link href="/admin/capacidade">Ver capacidade</Link>
      </div>

      <section className={styles.panel}>
        <ProductionSessionForm errorCode={errorCode} created={created} />
      </section>
    </main>
  );
}
