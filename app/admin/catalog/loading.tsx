import styles from "../_styles/adminPrimitives.module.css";

export default function Loading() {
  return (
    <main className={`${styles.page} ${styles.stackSm}`}>
      <h1 className={styles.pageTitle}>Catalogo</h1>
      <p>Carregando catalogo...</p>
    </main>
  );
}
