import { OrderStatus, PrismaClient } from "@prisma/client";
import { buildCategoryIndex, buildCategoryPathLabel } from "@/lib/domain/categoryHierarchy";

export type CapacityWindowKey = "today" | "7" | "14" | "15" | "30";

const WINDOW_DAYS: Record<CapacityWindowKey, number> = {
  today: 1,
  "7": 7,
  "14": 14,
  "15": 15,
  "30": 30,
};

export type CapacitySkuRow = {
  skuId: string;
  skuName: string;
  unitLabel: string;
  unitType: string;
  stockQuantity: number;
  produced: number;
  consumed: number;
  available: number;
  demand: number;
  gap: number;
};

export type CapacityRow = {
  productId: string;
  productName: string;
  categoryName: string;
  unitLabel: string | null;
  unitType: string | null;
  produced: number;
  consumed: number;
  available: number;
  demand: number;
  gap: number;
  skus: CapacitySkuRow[];
};

type CapacityOptions = {
  window: CapacityWindowKey; // Demanda (futuro)
  productionWindow?: CapacityWindowKey; // Produção/Consumo (passado) — aplicar default "15"
  productQuery?: string;
  gapOnly?: boolean;
};

export type UnavailableItem = {
  productId: string;
  requiredQty: number;
  availableNow: number;
  shortage: number;
};

export type OrderAvailabilityDetail = {
  skuId: string;
  productId: string;
  requiredQty: number;
  availableNow: number;
  gapQty: number;
};

type OrderAvailabilityItem = {
  skuId?: string | null;
  quantity?: unknown;
};

type OrderAvailabilityInput = {
  id: string;
  status: OrderStatus;
  items?: OrderAvailabilityItem[];
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function normalizeCapacityWindow(value?: string): CapacityWindowKey {
  if (value === "today" || value === "7" || value === "14" || value === "15" || value === "30") {
    return value;
  }
  return "7";
}

export function getCapacityWindowDays(window: CapacityWindowKey) {
  return WINDOW_DAYS[window];
}

export function getWindowRange(window: CapacityWindowKey, now = new Date()) {
  const start = startOfDay(now);
  const days = WINDOW_DAYS[window];
  const end = endOfDay(addDays(start, days - 1));
  return { start, end };
}

// Range de CALENDÁRIO para "últimos X dias" (passado)
// Usado para filtrar produção/consumo por período histórico
export function getPastWindowRange(window: CapacityWindowKey, now = new Date()) {
  const end = endOfDay(now); // Fim: hoje (inclusive)
  const days = WINDOW_DAYS[window];
  const start = startOfDay(addDays(now, -days + 1)); // Início: X dias atrás
  return { start, end };
}

export async function getDefaultSkuMap(
  prisma: PrismaClient,
  productIds: string[]
) {
  if (productIds.length === 0) {
    return new Map<
      string,
      {
        unitType: string;
        unitLabel: string;
        minQty: number;
        quantityStep: number;
      }
    >();
  }

  const skus = await prisma.sku.findMany({
    where: {
      productId: { in: productIds },
      isActive: true,
    },
    orderBy: [{ productId: "asc" }, { createdAt: "asc" }],
    select: {
      productId: true,
      unitType: true,
      unitLabel: true,
      minQty: true,
      quantityStep: true,
    },
  });

  const map = new Map<
    string,
    {
      unitType: string;
      unitLabel: string;
      minQty: number;
      quantityStep: number;
    }
  >();

  for (const sku of skus) {
    if (map.has(sku.productId)) continue;
    map.set(sku.productId, {
      unitType: sku.unitType,
      unitLabel: sku.unitLabel,
      minQty: asNumber(sku.minQty),
      quantityStep: asNumber(sku.quantityStep),
    });
  }

  return map;
}

export async function getCapacityRows(
  prisma: PrismaClient,
  options: CapacityOptions
) {
  const productQuery = options.productQuery?.trim() ?? "";
  const { start, end } = getWindowRange(options.window); // Demanda (futuro)

  // Determinar effectiveProductionWindow (default "15")
  const effectiveProductionWindow = options.productionWindow ?? ("15" as CapacityWindowKey);
  // Calcular productionRange usando range de CALENDÁRIO para "últimos X dias"
  const productionRange = getPastWindowRange(effectiveProductionWindow);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      name: productQuery ? { contains: productQuery } : undefined,
    },
    include: {
      category: { select: { id: true, name: true, parentId: true } },
      skus: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          displayName: true,
          unitLabel: true,
          unitType: true,
          stockQuantity: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) {
    return [] as CapacityRow[];
  }

  const categoryList = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const { byId } = buildCategoryIndex(categoryList);

  // TODO: Se volume crescer, considerar groupBy por skuId no Prisma para agregar no banco
  const [producedItems, consumedItems, demandItems] = await Promise.all([
    prisma.productionSessionItem.findMany({
      where: {
        sku: { productId: { in: productIds } },
        session: {
          producedAt: {
            gte: productionRange.start,
            lt: productionRange.end, // IMPORTANTE: lt, não lte
          },
        },
      },
      select: { quantity: true, sku: { select: { id: true, productId: true } } },
    }),
    prisma.productionConsumption.findMany({
      where: {
        sku: { productId: { in: productIds } },
        consumedAt: {
          gte: productionRange.start,
          lt: productionRange.end, // IMPORTANTE: lt, não lte
        },
      },
      select: { quantity: true, sku: { select: { id: true, productId: true } } },
    }),
    prisma.orderItem.findMany({
      where: {
        sku: { productId: { in: productIds } },
        order: {
          status: { in: ["CONFIRMADO", "EM_PRODUCAO", "RASCUNHO"] },
          deliveryDatetime: {
            gte: start,
            lte: end,
          },
        },
      },
      select: {
        quantity: true,
        sku: { select: { id: true, productId: true } },
      },
    }),
  ]);

  // Maps por produto (agregado)
  const producedMap = new Map<string, number>();
  const consumedMap = new Map<string, number>();
  const demandMap = new Map<string, number>();
  
  // Maps por SKU (individual)
  const producedBySku = new Map<string, number>();
  const consumedBySku = new Map<string, number>();
  const demandBySku = new Map<string, number>();
  
  for (const item of producedItems) {
    const productId = item.sku?.productId;
    const skuId = item.sku?.id;
    if (!productId) continue;
    // Garantir NUMBER para evitar problemas com Decimal/string em sort
    const qty = Number(asNumber(item.quantity));
    producedMap.set(productId, (producedMap.get(productId) ?? 0) + qty);
    if (skuId) {
      producedBySku.set(skuId, (producedBySku.get(skuId) ?? 0) + qty);
    }
  }
  
  for (const item of consumedItems) {
    const productId = item.sku?.productId;
    const skuId = item.sku?.id;
    if (!productId) continue;
    // Garantir NUMBER para evitar problemas com Decimal/string em sort
    const qty = Number(asNumber(item.quantity));
    consumedMap.set(productId, (consumedMap.get(productId) ?? 0) + qty);
    if (skuId) {
      consumedBySku.set(skuId, (consumedBySku.get(skuId) ?? 0) + qty);
    }
  }
  
  for (const item of demandItems) {
    const productId = item.sku?.productId;
    const skuId = item.sku?.id;
    if (!productId) continue;
    const qty = asNumber(item.quantity);
    demandMap.set(productId, (demandMap.get(productId) ?? 0) + qty);
    if (skuId) {
      demandBySku.set(skuId, (demandBySku.get(skuId) ?? 0) + qty);
    }
  }

  const rows = products.map((product) => {
    // Garantir NUMBER para evitar problemas com Decimal/string em sort
    const produced = Number(producedMap.get(product.id) ?? 0);
    const consumed = Number(consumedMap.get(product.id) ?? 0);
    const demand = Number(demandMap.get(product.id) ?? 0);
    const available = produced - consumed;
    const sku = product.skus[0];

    // Calcular SKUs individuais
    const skuRows: CapacitySkuRow[] = product.skus.map((sku) => {
      // Garantir NUMBER para evitar problemas com Decimal/string em sort
      const skuProduced = Number(producedBySku.get(sku.id) ?? 0);
      const skuConsumed = Number(consumedBySku.get(sku.id) ?? 0);
      const skuDemand = Number(demandBySku.get(sku.id) ?? 0);
      const skuStockQty = Number(sku.stockQuantity ?? 0);
      // Disponibilidade = Produzido - Consumido (disponibilidade de produção)
      // stockQuantity é o estoque atual (usado para PRONTA_ENTREGA)
      const skuAvailable = skuProduced - skuConsumed;
      // Gap considera o maior entre stockQuantity e disponibilidade de produção
      const skuEffectiveAvailable = Math.max(skuStockQty, skuAvailable);
      const skuGap = Math.max(skuDemand - skuEffectiveAvailable, 0);
      
      return {
        skuId: sku.id,
        skuName: sku.displayName,
        unitLabel: sku.unitLabel,
        unitType: sku.unitType,
        stockQuantity: skuStockQty,
        produced: skuProduced,
        consumed: skuConsumed,
        available: skuAvailable,
        demand: skuDemand,
        gap: skuGap,
      };
    });
    // Gap do produto = soma dos gaps por SKU (reflete necessidade real por variedade)
    const gap = skuRows.reduce((sum, s) => sum + s.gap, 0);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3e265bb7-e841-4942-a08a-d26ddc44c778',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'production.ts:280',message:'Capacity row calculated with SKUs',data:{productId:product.id,productName:product.name,produced,consumed,available,demand,gap,skusCount:skuRows.length,skus:skuRows.map(s=>({skuId:s.skuId,skuName:s.skuName,stockQuantity:s.stockQuantity,available:s.available}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    return {
      productId: product.id,
      productName: product.name,
      categoryName: buildCategoryPathLabel(byId, product.categoryId),
      unitLabel: sku?.unitLabel ?? null,
      unitType: sku?.unitType ?? null,
      produced,
      consumed,
      available,
      demand,
      gap,
      skus: skuRows,
    };
  });

  if (options.gapOnly) {
    return rows.filter((row) => row.gap > 0);
  }

  return rows;
}

export async function getProductCapacitySnapshot(
  prisma: PrismaClient,
  productId: string,
  window: CapacityWindowKey,
  now = new Date()
) {
  const { start, end } = getWindowRange(window, now);

  const [producedItems, consumedItems, demandItems] = await Promise.all([
    prisma.productionSessionItem.findMany({
      where: { sku: { productId } },
      select: { quantity: true },
    }),
    prisma.productionConsumption.findMany({
      where: { sku: { productId } },
      select: { quantity: true },
    }),
    prisma.orderItem.findMany({
      where: {
        sku: { productId },
        order: {
          status: { in: ["CONFIRMADO", "EM_PRODUCAO", "RASCUNHO"] },
          deliveryDatetime: {
            gte: start,
            lte: end,
          },
        },
      },
      select: { quantity: true },
    }),
  ]);

  const produced = producedItems.reduce(
    (sum, item) => sum + asNumber(item.quantity),
    0
  );
  const consumed = consumedItems.reduce(
    (sum, item) => sum + asNumber(item.quantity),
    0
  );
  const available = produced - consumed;
  const demand = demandItems.reduce(
    (sum, item) => sum + asNumber(item.quantity),
    0
  );
  const gap = Math.max(demand - available, 0);

  return {
    produced,
    consumed,
    available,
    demand,
    gap,
    windowStart: start,
    windowEnd: end,
  };
}

async function getAvailableNowByProductIds(
  prisma: PrismaClient,
  productIds: string[]
) {
  if (productIds.length === 0) {
    return new Map<string, number>();
  }

  const [producedItems, consumedItems] = await Promise.all([
    prisma.productionSessionItem.findMany({
      where: { sku: { productId: { in: productIds } } },
      select: { quantity: true, sku: { select: { productId: true } } },
    }),
    prisma.productionConsumption.findMany({
      where: { sku: { productId: { in: productIds } } },
      select: { quantity: true, sku: { select: { productId: true } } },
    }),
  ]);

  const producedMap = new Map<string, number>();
  for (const item of producedItems) {
    const productId = item.sku?.productId;
    if (!productId) continue;
    producedMap.set(productId, (producedMap.get(productId) ?? 0) + asNumber(item.quantity));
  }
  const consumedMap = new Map<string, number>();
  for (const item of consumedItems) {
    const productId = item.sku?.productId;
    if (!productId) continue;
    consumedMap.set(productId, (consumedMap.get(productId) ?? 0) + asNumber(item.quantity));
  }

  const availableMap = new Map<string, number>();
  for (const productId of productIds) {
    const produced = producedMap.get(productId) ?? 0;
    const consumed = consumedMap.get(productId) ?? 0;
    const available = produced - consumed;
    availableMap.set(productId, available);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/3e265bb7-e841-4942-a08a-d26ddc44c778',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'production.ts:358',message:'Product availability calculation',data:{productId,produced,consumed,available},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }

  return availableMap;
}

export async function computeUnavailableItemsForOrders(
  prisma: PrismaClient,
  orders: OrderAvailabilityInput[]
) {
  const skuIds = new Set<string>();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (typeof item.skuId === "string" && item.skuId.trim()) {
        skuIds.add(item.skuId);
      }
    }
  }

  const skuList = Array.from(skuIds);
  const skuRows = skuList.length
    ? await prisma.sku.findMany({
        where: { id: { in: skuList } },
        select: { id: true, productId: true, stockQuantity: true },
      })
    : [];
  const skuToProduct = new Map(
    skuRows.map((sku) => [sku.id, sku.productId])
  );
  // Disponibilidade por SKU (stockQuantity), alinhado à lista de pedidos (computeOrderStockStatus)
  const availableBySku = new Map(
    skuRows.map((s) => [s.id, Number(asNumber(s.stockQuantity ?? 0))])
  );

  const result = new Map<
    string,
    {
      hasUnavailableItems: boolean;
      unavailableItems: UnavailableItem[];
      itemAvailability: OrderAvailabilityDetail[];
    }
  >();

  for (const order of orders) {
    if (order.status === "CANCELADO" || order.status === "ENTREGUE") {
      result.set(order.id, {
        hasUnavailableItems: false,
        unavailableItems: [],
        itemAvailability: [],
      });
      continue;
    }

    const unavailableItems: UnavailableItem[] = [];
    const itemAvailability: OrderAvailabilityDetail[] = [];
    for (const item of order.items ?? []) {
      const skuId = typeof item.skuId === "string" ? item.skuId : "";
      if (!skuId) continue;
      const productId = skuToProduct.get(skuId);
      if (!productId) continue;
      const requiredQty = asNumber(item.quantity);
      const availableNow = availableBySku.get(skuId) ?? 0;
      const gapQty = Math.max(requiredQty - availableNow, 0);

      itemAvailability.push({
        skuId,
        productId,
        requiredQty,
        availableNow,
        gapQty,
      });
      if (requiredQty > availableNow) {
        unavailableItems.push({
          productId,
          requiredQty,
          availableNow,
          shortage: requiredQty - availableNow,
        });
      }
    }

    result.set(order.id, {
      hasUnavailableItems: unavailableItems.length > 0,
      unavailableItems,
      itemAvailability,
    });
  }

  return result;
}

export type OrderStockStatus = {
  needsProduction: boolean;
  deliveredShortage: boolean;
};

export async function computeOrderStockStatus(
  prisma: PrismaClient,
  orders: OrderAvailabilityInput[]
) {
  const skuIds = new Set<string>();
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (typeof item.skuId === "string" && item.skuId.trim()) {
        skuIds.add(item.skuId);
      }
    }
  }

  const skuList = Array.from(skuIds);
  const skuRows = skuList.length
    ? await prisma.sku.findMany({
        where: { id: { in: skuList } },
        select: {
          id: true,
          stockQuantity: true,
          pendingProductionQuantity: true,
        },
      })
    : [];
  const skuMap = new Map(
    skuRows.map((sku) => [
      sku.id,
      {
        stock: asNumber(sku.stockQuantity ?? 0),
        pending: asNumber(sku.pendingProductionQuantity ?? 0),
      },
    ])
  );

  const result = new Map<string, OrderStockStatus>();
  for (const order of orders) {
    const items = order.items ?? [];
    const totalsBySku = new Map<string, number>();
    for (const item of items) {
      const skuId = typeof item.skuId === "string" ? item.skuId : "";
      if (!skuId) continue;
      totalsBySku.set(skuId, (totalsBySku.get(skuId) ?? 0) + asNumber(item.quantity));
    }

    const isOperationalStatus =
      order.status === "CONFIRMADO" ||
      order.status === "EM_PRODUCAO" ||
      order.status === "PRONTO";

    let needsProduction = false;
    if (isOperationalStatus) {
      for (const [skuId, required] of totalsBySku.entries()) {
        const available = skuMap.get(skuId)?.stock ?? 0;
        if (required > available) {
          needsProduction = true;
          break;
        }
      }
    }

    let deliveredShortage = false;
    if (order.status === "ENTREGUE") {
      for (const skuId of totalsBySku.keys()) {
        if ((skuMap.get(skuId)?.pending ?? 0) > 0) {
          deliveredShortage = true;
          break;
        }
      }
    }

    result.set(order.id, { needsProduction, deliveredShortage });
  }

  return result;
}

export async function computeOrderPendingFlags(
  prisma: PrismaClient,
  order: OrderAvailabilityInput
) {
  const map = await computeUnavailableItemsForOrders(prisma, [order]);
  return (
    map.get(order.id) ?? {
      hasUnavailableItems: false,
      unavailableItems: [],
      itemAvailability: [],
    }
  );
}

export async function computeUnavailableItemsForDraft(
  prisma: PrismaClient,
  items: OrderAvailabilityItem[],
  status: OrderStatus = OrderStatus.RASCUNHO
) {
  const map = await computeUnavailableItemsForOrders(prisma, [
    { id: "draft", status, items },
  ]);
  return (
    map.get("draft") ?? {
      hasUnavailableItems: false,
      unavailableItems: [],
      itemAvailability: [],
    }
  );
}
