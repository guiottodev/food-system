import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createProductAction } from "../actions";
import {
  buildCategoryOptions,
  buildCategoryIndex,
  buildCategoryPathLabel,
} from "@/lib/domain/categoryHierarchy";
import ProductsNewForm from "./ProductsNewForm.client";
import styles from "../../_styles/adminPrimitives.module.css";

type ProductsNewSearchParams = {
  error?: string;
};

export default async function ProductsNewPage({
  searchParams,
}: {
  searchParams?: Promise<ProductsNewSearchParams> | ProductsNewSearchParams;
}) {
  const sp = await Promise.resolve(searchParams);
  const categories = await prisma.category.findMany({
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, isActive: true },
  });
  const { byId } = buildCategoryIndex(categories);
  
  // Categorias folha para o select (apenas para produtos)
  const leafOptions = buildCategoryOptions({
    categories,
    includeInactive: false,
    leavesOnly: true,
  });
  
  // Todas as categorias ativas para usar como pais na modal
  const allActiveCategories = buildCategoryOptions({
    categories,
    includeInactive: false,
    leavesOnly: false,
  });

  const recentCategoryIds = Array.from(
    new Set(
      (
        await prisma.product.findMany({
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { categoryId: true },
        })
      ).map((product) => product.categoryId)
    )
  );

  const recentCategories = recentCategoryIds
    .map((categoryId) => {
      const label = buildCategoryPathLabel(byId, categoryId);
      return label ? { id: categoryId, label } : null;
    })
    .filter((item): item is { id: string; label: string } => Boolean(item));

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Novo produto</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>

      {sp?.error === "campos" ? (
        <p className={styles.textError}>
          Informe nome e categoria para criar o produto.
        </p>
      ) : sp?.error === "sku_campos" ? (
        <p className={styles.textError}>
          Informe nome, tipo de venda e preco do primeiro SKU.
        </p>
      ) : sp?.error === "sku_preco" ? (
        <p className={styles.textError}>
          Informe um preco valido para o primeiro SKU.
        </p>
      ) : sp?.error === "sku_unit" ? (
        <p className={styles.textError}>
          Tipo de venda invalido para o primeiro SKU.
        </p>
      ) : sp?.error === "sku_referencia" ? (
        <p className={styles.textError}>
          Referencia deve ter no maximo 50 caracteres.
        </p>
      ) : sp?.error === "referencia_duplicada" ? (
        <p className={styles.textError}>
          Referencia ja utilizada por outro SKU.
        </p>
      ) : null}

      <ProductsNewForm
        categories={leafOptions}
        recentCategories={recentCategories}
        parentCategories={allActiveCategories}
        allCategories={categories}
        createProductAction={createProductAction}
      />
    </main>
  );
}
