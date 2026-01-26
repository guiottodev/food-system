import styles from "./products.module.css";

export default function ProductsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.productsTable}>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Categoria</th>
            <th className={styles.colNumeric}>SKUs / Un.</th>
            <th className={styles.colDisponivel}>Disponível</th>
            <th className={styles.colPreco}>Preço</th>
            <th className={styles.colActions}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td colSpan={6} style={{ padding: 0, borderBottom: "1px solid var(--border-subtle)" }}>
                <div className={styles.skeletonRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <div className={`${styles.skeletonCell} ${styles.skeletonCellIcon}`} />
                    <div className={styles.skeletonCell} style={{ flex: 1, maxWidth: 160 }} />
                  </div>
                  <div className={styles.skeletonCell} style={{ width: "70%" }} />
                  <div className={styles.skeletonCell} style={{ width: "60%" }} />
                  <div className={styles.skeletonCell} style={{ width: "50%" }} />
                  <div className={styles.skeletonCell} style={{ width: "55%" }} />
                  <div className={styles.skeletonCell} style={{ width: "45%" }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
