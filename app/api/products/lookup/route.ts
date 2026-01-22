import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";

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
  const rawLimit = Number(searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 50)
    : 10;

  if (!query) {
    return NextResponse.json({ items: [] });
  }

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      name: { contains: query },
    },
    orderBy: { name: "asc" },
    take: limit,
    include: {
      category: { select: { name: true } },
      skus: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          unitLabel: true,
          unitType: true,
          minQty: true,
          quantityStep: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: products
      .filter((product) => product.skus.length > 0)
      .map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.category.name,
        unitLabel: product.skus[0]?.unitLabel ?? null,
        unitType: product.skus[0]?.unitType ?? null,
        minQty: Number(product.skus[0]?.minQty ?? 0),
        quantityStep: Number(product.skus[0]?.quantityStep ?? 0),
      })),
  });
}
