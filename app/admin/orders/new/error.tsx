"use client";

import styles from "../../_styles/adminPrimitives.module.css";

export default function Error({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className={`${styles.page} ${styles.stackSm}`}>
      <h1 className={styles.pageTitle}>Novo pedido</h1>
      <p>Erro ao carregar formulario.</p>
      <button type="button" onClick={() => reset()}>
        Tentar novamente
      </button>
    </main>
  );
}
