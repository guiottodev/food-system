import styles from "../_styles/adminPrimitives.module.css";

export default function Loading() {
  return (
    <main className={`${styles.page} ${styles.stackSm}`}>
      <h1 className={styles.pageTitle}>Categorias</h1>
      <p>Carregando categorias...</p>
    </main>
  );
}
