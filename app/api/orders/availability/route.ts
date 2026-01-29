import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { computeUnavailableItemsForDraft } from "@/lib/domain/production";
import { parseQuantityToQ100 } from "@/lib/validation/unitQuantity";

type AvailabilityItem = {
  skuId?: string;
  quantity?: number | string;
};

async function hasValidSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return false;
  return Boolean(verifySessionValue(session.value));
}

export async function POST(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { items?: AvailabilityItem[]; orderType?: string } | null = null;
  try {
    payload = (await request.json()) as { items?: AvailabilityItem[]; orderType?: string };
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const orderType = payload?.orderType === "PRONTA_ENTREGA" ? "PRONTA_ENTREGA" : "ENCOMENDA";
  const normalizedItems = items
    .filter((item) => typeof item?.skuId === "string")
    .map((item) => ({
      skuId: item.skuId as string,
      quantity: item.quantity,
    }));


  const [productionAvailability, outOfStock] = await Promise.all([
    // “Precisa produzir / indisponível agora” (baseado em produção vs consumo por produto).
    computeUnavailableItemsForDraft(prisma, normalizedItems),
    // “Sem estoque” (apenas para PRONTA_ENTREGA, baseado em sku.stockQuantity).
    // Agora stockQuantity sempre reflete produced - consumed (sincronizado)
    (async () => {
      if (orderType !== "PRONTA_ENTREGA") {
        return { hasOutOfStockSkus: false, outOfStockSkus: [] as Array<{ skuId: string; requiredQty: number; availableQty: number }> };
      }
      const skuIds = normalizedItems.map((i) => i.skuId);
      const skus = skuIds.length
        ? await prisma.sku.findMany({
            where: { id: { in: skuIds } },
            select: { id: true, stockQuantity: true },
          })
        : [];
      const stockMap = new Map(skus.map((s) => [s.id, Number(s.stockQuantity ?? 0)]));

      const requiredMap = new Map<string, number>();
      for (const item of normalizedItems) {
        const parsed = parseQuantityToQ100(item.quantity as number | string);
        if (!parsed.ok) continue;
        const current = requiredMap.get(item.skuId) ?? 0;
        requiredMap.set(item.skuId, current + parsed.normalized);
      }

      const outOfStockSkus: Array<{ skuId: string; requiredQty: number; availableQty: number }> = [];
      for (const [skuId, requiredQty] of requiredMap.entries()) {
        const availableQty = stockMap.get(skuId) ?? 0;
        if (requiredQty > availableQty) {
          outOfStockSkus.push({ skuId, requiredQty, availableQty });
        }
      }
      return { hasOutOfStockSkus: outOfStockSkus.length > 0, outOfStockSkus };
    })(),
  ]);


  return NextResponse.json({
    hasUnavailableItems: productionAvailability.hasUnavailableItems,
    unavailableItems: productionAvailability.unavailableItems,
    hasOutOfStockSkus: outOfStock.hasOutOfStockSkus,
    outOfStockSkus: outOfStock.outOfStockSkus,
  });
}
