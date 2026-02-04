import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { isSkuAvailableInternal } from "@/lib/skuAvailability";
import type { Prisma } from "@prisma/client";
import { formatSkuLabel, normalizeText } from "@/lib/normalization";

async function hasValidSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return false;
  return Boolean(verifySessionValue(session.value));
}

export async function GET(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const normalizedQuery = normalizeText(query);
  const categoryId = searchParams.get("categoryId")?.trim() ?? "";
  const productId = searchParams.get("productId")?.trim() ?? "";
  const rawLimit = Number(searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 50)
    : 10;

  if (!query && !categoryId && !productId) {
    return NextResponse.json({ items: [] });
  }

  const productFilter: Prisma.ProductWhereInput = { isActive: true };
  if (categoryId) {
    productFilter.categoryId = categoryId;
  }
  if (productId) {
    productFilter.id = productId;
  }

  const where: Prisma.SkuWhereInput = {
    isActive: true,
    product: productFilter,
  };

  if (query && !productId) {
    where.OR = [
      { displayNameNormalized: { contains: normalizedQuery } },
      { referenciaNormalized: { contains: normalizedQuery } },
      { product: { nameNormalized: { contains: normalizedQuery } } },
    ];
  }

  const skus = await prisma.sku.findMany({
    where,
    take: limit,
    orderBy: { displayName: "asc" },
    include: {
      product: {
        select: {
          name: true,
          isActive: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    items: skus.map((sku) => ({
      sku,
      product: sku.product,
    }))
      .filter(({ sku, product }) => isSkuAvailableInternal({ sku, product }))
      .map(({ sku, product }) => ({
        skuId: sku.id,
        skuLabel: formatSkuLabel(sku.displayName, sku.referencia),
        productName: product.name,
        categoryName: product.category.name,
        unit: sku.unitLabel,
        unitLabel: sku.unitLabel,
        unitType: sku.unitType,
        price: Number(sku.priceCurrent),
        minQty: Number(sku.minQty),
        quantityStep: Number(sku.quantityStep),
      })),
  });
}
