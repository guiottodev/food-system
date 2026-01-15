import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createSkuAction,
  duplicateSkuAction,
  updateSkuAction,
} from "./actions";
import ProductTabs from "./ProductTabs";
import ProductDetailsForm from "./ProductDetailsForm";
import ProductImagesForm from "./ProductImagesForm";
import ProductSkusSection from "./ProductSkusSection.client";
import styles from "../../_styles/adminPrimitives.module.css";
import type { SkuAttributeInput } from "@/lib/validation/skuAttributes";

type ProductSearchParams = {
  error?: string;
  tab?: string;
  skuMode?: string;
  skuId?: string;
};

function parseAttributesJson(value: string | null): SkuAttributeInput[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        key: String(item?.key ?? ""),
        value: String(item?.value ?? ""),
      }))
      .filter((item) => item.key || item.value);
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<ProductSearchParams> | ProductSearchParams;
}) {
  const p = await Promise.resolve(params);
  const sp = await Promise.resolve(searchParams);
  const productId = p?.id;
  const tab = sp?.tab;
  const skuMode = sp?.skuMode;
  const skuId = sp?.skuId;
  const error = sp?.error;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      images: true,
      skus: {
        include: {
          tags: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) {
    return (
      <main className={`${styles.page} ${styles.stackSm}`}>
        <p>Produto nao encontrado.</p>
        <Link href="/admin/products">Voltar</Link>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const imageExtraUrls = product.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => img.url)
    .join("\n");

  const productErrorMessage =
    error === "campos" ? "Preencha nome e categoria para salvar." : "";
  const skuErrorMessage =
    error === "sku_campos"
      ? "Preencha nome, tipo de venda e preco."
      : error === "sku_unit"
      ? "Tipo de venda invalido."
      : error === "sku_quantidade"
      ? "Regras de quantidade invalidas para o tipo de venda."
      : error === "sku_atributos"
      ? "Revise os atributos do SKU."
      : "";

  const initialTab =
    tab === "skus" || tab === "images" || tab === "details" ? tab : "details";
  const initialSkuMode =
    skuMode === "edit" || skuMode === "new" ? skuMode : undefined;
  const initialSkuId = skuId || undefined;

  const skusView = product.skus.map((sku) => ({
    id: sku.id,
    displayName: sku.displayName,
    sizeText: sku.sizeText,
    flavorText: sku.flavorText || "",
    attributes: parseAttributesJson(sku.attributesJson),
    attributesJson: sku.attributesJson ?? null,
    isFrozen: sku.isFrozen,
    unitType: sku.unitType,
    unitLabel: sku.unitLabel,
    priceCurrent: Number(sku.priceCurrent),
    cost: sku.cost ? Number(sku.cost) : null,
    isActive: sku.isActive,
    sobConsultaOverride: sku.sobConsultaOverride,
    tags: sku.tags.map((tag) => tag.name),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Produto: {product.name}</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>

      <ProductTabs activeTab={initialTab} productId={product.id} />
      {initialTab === "details" ? (
        <ProductDetailsForm
          product={{
            id: product.id,
            name: product.name,
            categoryId: product.categoryId,
            descriptionLong: product.descriptionLong,
            leadTime: product.leadTime ?? null,
            isActive: product.isActive,
            isPublicHidden: product.isPublicHidden,
            sobConsulta: product.sobConsulta,
          }}
          categories={categories}
          errorMessage={productErrorMessage}
        />
      ) : null}
      {initialTab === "skus" ? (
        <ProductSkusSection
          productId={product.id}
          productSobConsulta={product.sobConsulta}
          skus={skusView}
          createSkuAction={createSkuAction}
          updateSkuAction={updateSkuAction}
          duplicateSkuAction={duplicateSkuAction}
          initialMode={initialSkuMode}
          initialSkuId={initialSkuId}
          skuErrorMessage={skuErrorMessage}
        />
      ) : null}
      {initialTab === "images" ? (
        <ProductImagesForm
          productId={product.id}
          imageMainUrl={product.imageMainUrl}
          imageExtraUrls={imageExtraUrls}
        />
      ) : null}
    </main>
  );
}
