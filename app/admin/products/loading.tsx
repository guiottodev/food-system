import styles from "../_styles/adminPrimitives.module.css";
import layoutStyles from "./products.module.css";
import ProductsTableSkeleton from "./ProductsTableSkeleton";

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={layoutStyles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Produtos</h1>
          <p className={layoutStyles.pageSubtitle}>Gerencie seu catálogo</p>
        </div>
        <div className={layoutStyles.kpiGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={layoutStyles.kpiCard}>
              <div className={layoutStyles.skeletonCell} style={{ width: 48, height: 24 }} />
              <div className={layoutStyles.skeletonCell} style={{ width: 64, height: 14 }} />
            </div>
          ))}
        </div>
      </div>

      <section className={`${styles.panel} ${layoutStyles.productsPanel}`}>
        <div className={layoutStyles.toolbarBlock}>
          <div className={layoutStyles.toolbar}>
            <div className={layoutStyles.skeletonCell} style={{ height: 38, flex: "1 1 280px", maxWidth: 360 }} />
            <div className={layoutStyles.skeletonCell} style={{ height: 38, width: 140 }} />
          </div>
        </div>
        <ProductsTableSkeleton rows={6} />
      </section>
    </main>
  );
}
