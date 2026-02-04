import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ConfiguracoesAtributos from "./ConfiguracoesAtributos.client";
import styles from "../_styles/adminPrimitives.module.css";

export default async function ConfiguracoesPage() {
  const attributes = await prisma.atributo.findMany({
    orderBy: { name: "asc" },
    include: {
      valores: { orderBy: { sortOrder: "asc" } },
      _count: { select: { skuAtributos: true } },
    },
  });

  const initialAttributes = attributes.map((attr) => ({
    id: attr.id,
    name: attr.name,
    type: attr.type,
    unit: attr.unit,
    isActive: attr.isActive,
    values: attr.valores.map((val) => ({ id: val.id, value: val.value })),
    skuUsageCount: attr._count.skuAtributos,
  }));

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Configuracoes</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>

      <ConfiguracoesAtributos initialAttributes={initialAttributes} />
    </main>
  );
}
