import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "../_styles/adminPrimitives.module.css";

export default async function CatalogPage() {
  const activeSkus = await prisma.sku.count({
    where: { isActive: true, product: { isActive: true } },
  });

  return (
    <main className={styles.page}>
      <div className={styles.clusterSm}>
        <Link className={styles.topNavLink} href="/admin">
          Admin
        </Link>
        <span className={styles.textMuted}>&gt;</span>
        <span className={styles.textMuted}>Catalogo</span>
      </div>

      <h1 className={styles.pageTitle}>Catalogo</h1>

      <section className={styles.panel}>
        <div className={styles.panelBody}>
          <p>SKUs ativos: {activeSkus}</p>
          <div className={styles.stackSm}>
            <Link className={styles.panelLink} href="/admin/categories">
              Categorias
            </Link>
            <Link className={styles.panelLink} href="/admin/products">
              Produtos
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
