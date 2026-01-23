import styles from "./orders.module.css";

export default function OrdersTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.ordersTable}>
        <thead>
          <tr>
            <th className={styles.colExpand}></th>
            <th className={styles.colOrder}>Pedido</th>
            <th className={styles.colCustomer}>Cliente</th>
            <th className={styles.colMethod}>Método</th>
            <th className={styles.colStatus}>Status</th>
            <th className={styles.colDate}>Entrega</th>
            <th className={styles.colTotal}>Total</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td colSpan={7} style={{ padding: 0 }}>
                <div className={styles.skeletonRow}>
                  <div className={`${styles.skeletonCell} ${styles.skeletonCellIcon}`} />
                  <div>
                    <div className={styles.skeletonCell} style={{ width: "90%" }} />
                  </div>
                  <div>
                    <div className={styles.skeletonCell} style={{ width: "70%" }} />
                    <div className={`${styles.skeletonCell} ${styles.skeletonCellSm}`} style={{ width: "50%" }} />
                  </div>
                  <div>
                    <div className={styles.skeletonCell} style={{ width: "80%" }} />
                  </div>
                  <div>
                    <div className={styles.skeletonCell} style={{ width: "60%" }} />
                  </div>
                  <div>
                    <div className={styles.skeletonCell} style={{ width: "75%" }} />
                    <div className={`${styles.skeletonCell} ${styles.skeletonCellSm}`} style={{ width: "40%" }} />
                  </div>
                  <div>
                    <div className={styles.skeletonCell} style={{ width: "85%", marginLeft: "auto" }} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
