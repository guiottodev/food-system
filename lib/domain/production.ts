import { OrderStatus, PrismaClient } from "@prisma/client";

export type CapacityWindowKey = "today" | "7" | "14" | "30";

const WINDOW_DAYS: Record<CapacityWindowKey, number> = {
  today: 1,
  "7": 7,
  "14": 14,
  "30": 30,
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
};

type CapacityOptions = {
  window: CapacityWindowKey;
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
  if (value === "today" || value === "7" || value === "14" || value === "30") {
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
  const { start, end } = getWindowRange(options.window);

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      name: productQuery ? { contains: productQuery } : undefined,
    },
    include: {
      category: { select: { name: true } },
      skus: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          unitLabel: true,
          unitType: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) {
    return [] as CapacityRow[];
  }

  const [producedAgg, consumedAgg, demandItems] = await Promise.all([
    prisma.productionSessionItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
      },
      _sum: { quantity: true },
    }),
    prisma.productionConsumption.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
      },
      _sum: { quantity: true },
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
        sku: { select: { productId: true } },
      },
    }),
  ]);

  const producedMap = new Map(
    producedAgg.map((row) => [
      row.productId,
      asNumber(row._sum.quantity ?? 0),
    ])
  );
  const consumedMap = new Map(
    consumedAgg.map((row) => [
      row.productId,
      asNumber(row._sum.quantity ?? 0),
    ])
  );
  const demandMap = new Map<string, number>();
  for (const item of demandItems) {
    const productId = item.sku?.productId;
    if (!productId) continue;
    const current = demandMap.get(productId) ?? 0;
    demandMap.set(productId, current + asNumber(item.quantity));
  }

  const rows = products.map((product) => {
    const produced = producedMap.get(product.id) ?? 0;
    const consumed = consumedMap.get(product.id) ?? 0;
    const demand = demandMap.get(product.id) ?? 0;
    const available = produced - consumed;
    const gap = Math.max(demand - available, 0);
    const sku = product.skus[0];
    return {
      productId: product.id,
      productName: product.name,
      categoryName: product.category.name,
      unitLabel: sku?.unitLabel ?? null,
      unitType: sku?.unitType ?? null,
      produced,
      consumed,
      available,
      demand,
      gap,
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

  const [producedAgg, consumedAgg, demandItems] = await Promise.all([
    prisma.productionSessionItem.aggregate({
      where: { productId },
      _sum: { quantity: true },
    }),
    prisma.productionConsumption.aggregate({
      where: { productId },
      _sum: { quantity: true },
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

  const produced = asNumber(producedAgg._sum.quantity ?? 0);
  const consumed = asNumber(consumedAgg._sum.quantity ?? 0);
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

  const [producedAgg, consumedAgg] = await Promise.all([
    prisma.productionSessionItem.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { quantity: true },
    }),
    prisma.productionConsumption.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _sum: { quantity: true },
    }),
  ]);

  const producedMap = new Map(
    producedAgg.map((row) => [
      row.productId,
      asNumber(row._sum.quantity ?? 0),
    ])
  );
  const consumedMap = new Map(
    consumedAgg.map((row) => [
      row.productId,
      asNumber(row._sum.quantity ?? 0),
    ])
  );

  const availableMap = new Map<string, number>();
  for (const productId of productIds) {
    const produced = producedMap.get(productId) ?? 0;
    const consumed = consumedMap.get(productId) ?? 0;
    availableMap.set(productId, produced - consumed);
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
        select: { id: true, productId: true },
      })
    : [];
  const skuToProduct = new Map(
    skuRows.map((sku) => [sku.id, sku.productId])
  );
  const productIds = Array.from(
    new Set(skuRows.map((sku) => sku.productId))
  );
  const availableMap = await getAvailableNowByProductIds(prisma, productIds);

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
      const availableNow = availableMap.get(productId) ?? 0;
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
