import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function CatalogPage() {
  const activeSkus = await prisma.sku.count({
    where: { isActive: true, product: { isActive: true } },
  });

  return (
    <main style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Link href="/admin">Admin</Link>
        <span>&gt;</span>
        <span>Catalogo</span>
      </div>

      <h1>Catalogo</h1>

      <p>SKUs ativos: {activeSkus}</p>

      <div style={{ display: "grid", gap: 12 }}>
        <Link href="/admin/categories">Categorias</Link>
        <Link href="/admin/products">Produtos</Link>
      </div>
    </main>
  );
}
