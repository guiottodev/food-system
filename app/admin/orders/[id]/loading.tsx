import styles from "../../_styles/adminPrimitives.module.css";

export default function Loading() {
  return (
    <main className={`${styles.page} ${styles.stackSm}`}>
      <h1 className={styles.pageTitle}>Pedido</h1>
      <p>Carregando detalhes do pedido...</p>
    </main>
  );
}
