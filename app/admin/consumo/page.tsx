import Link from "next/link";
import ConsumptionForm from "./ConsumptionForm.client";
import styles from "../_styles/adminPrimitives.module.css";

type SearchParams = {
  error?: string;
  created?: string;
  warnImpact?: string;
  warnNegative?: string;
  demand?: string;
  gap?: string;
  windowEnd?: string;
  quantity?: string;
  window?: string;
};

export default async function ConsumoPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const errorCode = sp?.error ?? "";
  const created = sp?.created === "1";
  const warnImpact = sp?.warnImpact === "1";
  const warnNegative = sp?.warnNegative === "1";
  const demand = Number(sp?.demand ?? 0);
  const gap = Number(sp?.gap ?? 0);
  const windowEnd = sp?.windowEnd ?? "";
  const quantity = Number(sp?.quantity ?? 0);
  const windowKey = sp?.window ?? "7";

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Consumo</h1>
        <Link href="/admin/capacidade">Ver capacidade</Link>
      </div>

      <section className={styles.panel}>
        <ConsumptionForm
          errorCode={errorCode}
          created={created}
          warnImpact={warnImpact}
          warnNegative={warnNegative}
          demand={demand}
          gap={gap}
          windowEnd={windowEnd}
          quantity={quantity}
          windowKey={windowKey}
        />
      </section>
    </main>
  );
}
