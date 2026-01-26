import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createSkuAction,
  duplicateSkuAction,
  updateSkuAction,
} from "./actions";
import ProductTabs from "./ProductTabs";
import ProductDetailsForm from "./ProductDetailsForm.client";
import ProductImagesForm from "./ProductImagesForm";
import ProductSkusSection from "./ProductSkusSection.client";
import styles from "../../_styles/adminPrimitives.module.css";
import type { SkuAttributeInput } from "@/lib/validation/skuAttributes";
import { buildCategoryOptions, buildCategoryPathLabel, buildCategoryIndex } from "@/lib/domain/categoryHierarchy";
import { InlineNotice } from "../../design-system/InlineNotice.client";

type ProductSearchParams = {
  error?: string;
  tab?: string;
  skuMode?: string;
  skuId?: string;
  created?: string;
  ready?: string;
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
  const created = sp?.created === "1";
  const ready = sp?.ready === "1";

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
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, parentId: true, isActive: true },
  });
  const leafCategoryOptions = buildCategoryOptions({
    categories,
    includeInactive: false,
    leavesOnly: true,
  }).map((c) => ({ id: c.id, label: c.label }));
  const { byId } = buildCategoryIndex(categories);
  const categoryLabel = buildCategoryPathLabel(byId, product.categoryId);

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
      ? "Defaults invalidos para o tipo de venda."
      : error === "sku_atributos"
      ? "Revise os atributos do SKU."
      : "";

  const initialTab =
    tab === "skus" || tab === "images" || tab === "details" ? tab : "skus";
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
    quantityStep: Number(sku.quantityStep),
    minQty: Number(sku.minQty),
    priceCurrent: Number(sku.priceCurrent),
    cost: sku.cost ? Number(sku.cost) : null,
    isActive: sku.isActive,
    tags: sku.tags.map((tag) => tag.name),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Produto: {product.name}</h1>
        <Link href="/admin/products">Voltar</Link>
      </div>
      {created ? (
        <InlineNotice tone="success" clearQueryKeys={["created"]}>
          Produto criado.
        </InlineNotice>
      ) : null}
      <div className={styles.clusterSm}>
        <span
          className={`${styles.badge} ${
            product.isActive ? styles.badgeSuccess : styles.badgeNeutral
          }`}
        >
          {product.isActive ? "Ativo" : "Inativo"}
        </span>
        <span className={`${styles.badge} ${styles.badgeNeutral}`}>
          {categoryLabel}
        </span>
      </div>

      <ProductTabs activeTab={initialTab} productId={product.id} />
      {initialTab === "details" ? (
        <ProductDetailsForm
          product={{
            id: product.id,
            name: product.name,
            categoryId: product.categoryId,
            descriptionLong: product.descriptionLong,
            isActive: product.isActive,
          }}
          categories={leafCategoryOptions}
          errorMessage={productErrorMessage}
        />
      ) : null}
      {initialTab === "skus" ? (
        <ProductSkusSection
          productId={product.id}
          skus={skusView}
          createSkuAction={createSkuAction}
          updateSkuAction={updateSkuAction}
          duplicateSkuAction={duplicateSkuAction}
          initialMode={initialSkuMode}
          initialSkuId={initialSkuId}
          skuErrorMessage={skuErrorMessage}
          showReadyNotice={ready}
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
