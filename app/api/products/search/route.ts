import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import type { Prisma } from "@prisma/client";

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
  const categoryId = searchParams.get("categoryId")?.trim() ?? "";
  const rawLimit = Number(searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 50)
    : 10;

  if (!query && !categoryId) {
    return NextResponse.json({ items: [] });
  }

  const productFilter: Prisma.ProductWhereInput = { isActive: true };
  if (categoryId) {
    productFilter.categoryId = categoryId;
  }

  const where: Prisma.SkuWhereInput = {
    isActive: true,
    product: productFilter,
  };

  if (query) {
    where.OR = [
      { displayName: { contains: query } },
      { product: { name: { contains: query } } },
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
          category: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({
    items: skus.map((sku) => ({
      skuId: sku.id,
      skuLabel: sku.displayName,
      productName: sku.product.name,
      categoryName: sku.product.category.name,
      unit: sku.unitLabel,
      unitType: sku.unitType,
      price: Number(sku.priceCurrent),
      minQty: Number(sku.minQty),
      quantityStep: Number(sku.quantityStep),
    })),
  });
}
