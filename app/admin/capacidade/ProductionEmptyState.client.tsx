"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import layoutStyles from "./capacidade.module.css";
import styles from "../_styles/adminPrimitives.module.css";

export default function ProductionEmptyState() {
  return (
    <div className={layoutStyles.emptyState}>
      <BarChart3 size={48} className={layoutStyles.emptyStateIcon} strokeWidth={1.25} />
      <div className={layoutStyles.emptyStateTitle}>Nenhum produto encontrado</div>
      <div className={layoutStyles.emptyStateText}>
        Ajuste os filtros ou cadastre produtos no sistema.
      </div>
      <Link href="/admin/products" className={`${styles.button} ${styles.buttonPrimary}`}>
        Ir para Produtos
      </Link>
    </div>
  );
}
