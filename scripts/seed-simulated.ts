/**
 * Seed simulado: base determinística 2025-12-01 a 2026-02-28.
 * Uso: npx tsx scripts/seed-simulated.ts [--mode=golden|bulk|full] [--reset]
 *
 * Ver docs/SEED_SIMULATED.md para invariants, modos e correções.
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { computeUnavailableItemsForOrders } from "@/lib/domain/production";
import {
  getOrderReadiness,
  getOrderPendingSummary,
} from "@/lib/domain/order";
import type { OrderStatus, UnitType } from "@prisma/client";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  getSkuDefaults,
  unitLabelFor,
  normalizeUnitType,
} = require("../lib/unit") as {
  getSkuDefaults: (t: string) => { minQty: number; quantityStep: number; unitLabel: string };
  unitLabelFor: (t: string) => string;
  normalizeUnitType: (t: string) => "KG" | "UNIDADE";
};

const SEED = Number(process.env.SEED ?? 20260201);
const PERIOD_START = new Date("2025-12-01T00:00:00.000Z");
const PERIOD_END = new Date("2026-02-28T23:59:59.999Z");
const ORDERS_PER_MONTH = 150;
const TOTAL_ORDERS = 450;
const TOTAL_CUSTOMERS = 300;
const TOTAL_PRODUCTS = 130;
const TOTAL_CATEGORIES = 12;
const CRITICAL_PRODUCT_COUNT = 10;
const UNAVAILABLE_ORDERS_TARGET = 40;
const MIN_RECONFIRM = 25;
const MIN_NO_ITEMS = 20;
const MIN_NO_DATE = 20;
const MIN_DELIVERY_NO_ADDRESS = 30;
const CUSTOMERS_WITH_ORDERS_PCT = 0.7;

type Mode = "golden" | "bulk" | "full";

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseArgs(argv: string[]): { mode: Mode; reset: boolean } {
  let mode: Mode = "full";
  let reset = false;
  for (const arg of argv) {
    if (arg === "--reset") {
      reset = true;
      continue;
    }
    const m = arg.match(/^--mode=(golden|bulk|full)$/);
    if (m) mode = m[1] as Mode;
  }
  return { mode, reset };
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function prng(seed: number) {
  const next = mulberry32(seed);
  return {
    randInt(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    sample<T>(arr: T[]): T {
      return arr[Math.floor(next() * arr.length)]!;
    },
    shuffle<T>(arr: T[]): T[] {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    randomDate(start: Date, end: Date): Date {
      const a = start.getTime();
      const b = end.getTime();
      return new Date(a + next() * (b - a));
    },
  };
}

/** Telefones 10–11 dígitos, únicos. Alguns "quase-duplicados": mesmo prefixo + último dígito diferente. */
function generatePhones(rng: ReturnType<typeof prng>, count: number): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  const base = 11_000_000_000;
  const nPairs = Math.min(10, Math.floor(count / 30));
  const remainder = count - nPairs * 2;

  for (let i = 0; i < remainder; i++) {
    let n: number;
    do {
      n = base + rng.randInt(0, 99_999_999);
    } while (used.has(String(n)));
    used.add(String(n));
    out.push(String(n));
  }
  for (let k = 0; k < nPairs; k++) {
    let n: number;
    do {
      n = base + rng.randInt(0, 99_999_999);
    } while (used.has(String(n)));
    used.add(String(n));
    const s = String(n);
    const last = parseInt(s.slice(-1), 10);
    const other = (last + 1) % 10;
    const alt = s.slice(0, -1) + String(other);
    if (used.has(alt)) continue;
    used.add(alt);
    out.push(s, alt);
  }
  return rng.shuffle(out);
}

async function reset(prisma: PrismaClient) {
  const del = async (name: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      console.log(`   ${name}`);
    } catch (e) {
      console.warn(`   ${name} (skip: ${(e as Error).message})`);
    }
  };

  console.log("Reset: deletando tabelas (ordem FKs)...");
  await del("OrderItem", () => prisma.orderItem.deleteMany({}));
  await del("InventoryMovement", () => prisma.inventoryMovement.deleteMany({}));
  await del("Order", () => prisma.order.deleteMany({}));
  await del("CustomerAddress", () => prisma.customerAddress.deleteMany({}));
  await del("Customer", () => prisma.customer.deleteMany({}));
  await del("ProductionSessionItem", () =>
    prisma.productionSessionItem.deleteMany({})
  );
  await del("ProductionSession", () =>
    prisma.productionSession.deleteMany({})
  );
  await del("ProductionConsumption", () =>
    prisma.productionConsumption.deleteMany({})
  );
  await del("InventoryStock", () => prisma.inventoryStock.deleteMany({}));
  await del("SkuTag", () => prisma.skuTag.deleteMany({}));
  await del("CapacityRule", () => prisma.capacityRule.deleteMany({}));
  await del("Sku", () => prisma.sku.deleteMany({}));
  await del("ProductImage", () => prisma.productImage.deleteMany({}));
  await del("Product", () => prisma.product.deleteMany({}));
  await prisma.category.updateMany({ data: { parentId: null } }).catch(() => {});
  await del("Category", () => prisma.category.deleteMany({}));
  await del("AuditLog", () => prisma.auditLog.deleteMany({}));
  console.log("Reset concluído (Users mantidos).");
}

type SkuRow = {
  id: string;
  productId: string;
  displayName: string;
  unitLabel: string;
  unitType: UnitType;
  quantityStep: number;
  minQty: number;
  priceCurrent: number;
  sizeText: string | null;
  flavorText: string | null;
  isFrozen: boolean;
};

type ProductRow = { id: string; name: string; categoryId: string };

async function createDimensions(
  prisma: PrismaClient,
  rng: ReturnType<typeof prng>
): Promise<{
  categories: { id: string; name: string }[];
  products: ProductRow[];
  skus: SkuRow[];
  criticalProductIds: Set<string>;
}> {
  const categories = await Promise.all(
    Array.from({ length: TOTAL_CATEGORIES }, (_, i) =>
      prisma.category.create({
        data: {
          name: `Categoria Sim ${String(i + 1).padStart(2, "0")}`,
          isActive: true,
        },
      })
    )
  );

  const products: ProductRow[] = [];
  for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    const cat = rng.sample(categories);
    const p = await prisma.product.create({
      data: {
        name: `Produto Sim ${String(i + 1).padStart(3, "0")}`,
        categoryId: cat.id,
        isActive: true,
      },
    });
    products.push({ id: p.id, name: p.name, categoryId: p.categoryId });
  }

  const criticalProductIds = new Set<string>(
    products.slice(0, CRITICAL_PRODUCT_COUNT).map((p) => p.id)
  );

  const unitTypes: UnitType[] = ["UNIDADE", "KG"];
  const skuData: Prisma.SkuCreateManyInput[] = [];
  for (const p of products) {
    const nSkus = rng.randInt(1, 3);
    for (let k = 0; k < nSkus; k++) {
      const ut = unitTypes[k % unitTypes.length]!;
      const def = getSkuDefaults(ut);
      const label = unitLabelFor(ut);
      skuData.push({
        productId: p.id,
        sizeText: ut === "KG" ? "1kg" : "25g",
        flavorText: `Sabor ${k + 1}`,
        isFrozen: k % 2 === 0,
        displayName: `${p.name} ${ut} ${k + 1}`,
        unitLabel: label,
        unitType: normalizeUnitType(ut),
        quantityStep: toDecimal(def.quantityStep),
        minQty: toDecimal(def.minQty),
        priceCurrent: toDecimal(rng.randInt(8, 120)),
        isActive: true,
      });
    }
  }
  await prisma.sku.createMany({ data: skuData });

  const skus = await prisma.sku.findMany({
    select: {
      id: true,
      productId: true,
      displayName: true,
      unitLabel: true,
      unitType: true,
      quantityStep: true,
      minQty: true,
      priceCurrent: true,
      sizeText: true,
      flavorText: true,
      isFrozen: true,
    },
  });
  const skuRows: SkuRow[] = skus.map((s) => ({
    id: s.id,
    productId: s.productId,
    displayName: s.displayName,
    unitLabel: s.unitLabel,
    unitType: s.unitType,
    quantityStep: Number(s.quantityStep),
    minQty: Number(s.minQty),
    priceCurrent: Number(s.priceCurrent),
    sizeText: s.sizeText,
    flavorText: s.flavorText,
    isFrozen: s.isFrozen,
  }));

  await prisma.inventoryStock.createMany({
    data: skuRows.map((s) => ({ skuId: s.id, quantity: 0 })),
  });

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    products: products,
    skus: skuRows,
    criticalProductIds,
  };
}

async function createCustomers(
  prisma: PrismaClient,
  rng: ReturnType<typeof prng>
): Promise<{ id: string; name: string; phone: string; hasAddress: boolean }[]> {
  const phones = generatePhones(rng, TOTAL_CUSTOMERS);
  const withAddress = Math.floor(TOTAL_CUSTOMERS * 0.25);
  const result: { id: string; name: string; phone: string; hasAddress: boolean }[] = [];

  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const hasAddr = i < withAddress;
    const c = await prisma.customer.create({
      data: {
        name: `Cliente Sim ${String(i + 1).padStart(3, "0")}`,
        phone: phones[i]!,
        ...(hasAddr
          ? {
              addressStreet: `Rua Sim ${i + 1}`,
              addressNumber: String(rng.randInt(1, 999)),
              addressCity: "São Paulo",
              addressState: "SP",
              addressCep: "01310-100",
            }
          : {}),
      },
    });
    result.push({
      id: c.id,
      name: c.name,
      phone: c.phone,
      hasAddress: hasAddr,
    });
  }
  return result;
}

async function createProductionAndConsumption(
  prisma: PrismaClient,
  rng: ReturnType<typeof prng>,
  skus: SkuRow[],
  criticalProductIds: Set<string>
): Promise<Map<string, { produced: number; consumed: number }>> {
  const beforeStart = new Date("2025-11-15T00:00:00.000Z");
  const perSku = new Map<
    string,
    { produced: number; consumed: number }
  >();
  for (const s of skus) {
    perSku.set(s.id, { produced: 0, consumed: 0 });
  }

  const criticalSkus = skus.filter((s) => criticalProductIds.has(s.productId));
  const nonCriticalSkus = skus.filter((s) => !criticalProductIds.has(s.productId));

  for (const sku of criticalSkus) {
    const produced = 3;
    const ses = await prisma.productionSession.create({
      data: {
        producedAt: rng.randomDate(beforeStart, PERIOD_START),
        note: "Saldo inicial crítico",
      },
    });
    await prisma.productionSessionItem.create({
      data: {
        sessionId: ses.id,
        skuId: sku.id,
        quantity: toDecimal(produced),
      },
    });
    const cur = perSku.get(sku.id)!;
    cur.produced += produced;
  }

  for (let i = 0; i < 30; i++) {
    const sku = rng.sample(nonCriticalSkus);
    const q = rng.randInt(5, 50);
    const ses = await prisma.productionSession.create({
      data: {
        producedAt: rng.randomDate(PERIOD_START, PERIOD_END),
        note: "Sim período",
      },
    });
    await prisma.productionSessionItem.create({
      data: { sessionId: ses.id, skuId: sku.id, quantity: toDecimal(q) },
    });
    const cur = perSku.get(sku.id)!;
    cur.produced += q;
  }

  return perSku;
}

function nextOrderNumber(
  counters: Record<number, number>,
  year: number
): string {
  const next = counters[year] ?? 1;
  counters[year] = next + 1;
  return `${year}-${String(next).padStart(6, "0")}`;
}

async function getOrderNumberCounters(
  prisma: PrismaClient,
  startYear: number,
  endYear: number
): Promise<Record<number, number>> {
  const counters: Record<number, number> = {};
  for (let y = startYear; y <= endYear; y++) {
    const prefix = `${y}-`;
    const latest = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    counters[y] =
      latest?.orderNumber?.startsWith(prefix)
        ? Number(latest.orderNumber.slice(prefix.length)) + 1
        : 1;
  }
  return counters;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const STATUS_DIST: { status: OrderStatus; pct: number }[] = [
  { status: "ENTREGUE", pct: 0.25 },
  { status: "EM_PRODUCAO", pct: 0.2 },
  { status: "PRONTO", pct: 0.15 },
  { status: "CONFIRMADO", pct: 0.15 },
  { status: "RASCUNHO", pct: 0.15 },
  { status: "CANCELADO", pct: 0.1 },
];

async function createOrders(
  prisma: PrismaClient,
  rng: ReturnType<typeof prng>,
  customers: { id: string; name: string; phone: string; hasAddress: boolean }[],
  skus: SkuRow[],
  criticalProductIds: Set<string>,
  mode: Mode
): Promise<{
  orderIds: string[];
  unavailableOrderIds: string[];
  noItemsCount: number;
  noDateCount: number;
  reconfirmCount: number;
  deliveryNoAddressCount: number;
}> {
  const startYear = PERIOD_START.getFullYear();
  const endYear = PERIOD_END.getFullYear();
  const counters = await getOrderNumberCounters(prisma, startYear, endYear);

  const criticalSkus = skus.filter((s) => criticalProductIds.has(s.productId));
  const nonCriticalSkus = skus.filter((s) => !criticalProductIds.has(s.productId));

  const unavailableOrderIds: string[] = [];
  let noItemsCount = 0;
  let noDateCount = 0;
  let reconfirmCount = 0;
  let deliveryNoAddressCount = 0;

  const total =
    mode === "golden"
      ? Math.max(
          UNAVAILABLE_ORDERS_TARGET + MIN_NO_ITEMS + MIN_NO_DATE + MIN_RECONFIRM + MIN_DELIVERY_NO_ADDRESS,
          120
        )
      : TOTAL_ORDERS;

  const goldenNoItems = mode !== "bulk" ? MIN_NO_ITEMS : 0;
  const goldenNoDate = mode !== "bulk" ? MIN_NO_DATE : 0;
  const goldenReconfirm = mode !== "bulk" ? MIN_RECONFIRM : 0;
  const goldenDeliveryNoAddr = mode !== "bulk" ? MIN_DELIVERY_NO_ADDRESS : 0;
  const goldenUnavailable = mode !== "bulk" ? UNAVAILABLE_ORDERS_TARGET : 0;

  const statusPool: OrderStatus[] = [];
  for (const { status, pct } of STATUS_DIST) {
    const n = Math.round(total * pct);
    for (let i = 0; i < n; i++) statusPool.push(status);
  }
  while (statusPool.length < total) statusPool.push("RASCUNHO");
  const shuffled = rng.shuffle(statusPool);

  const orderIds: string[] = [];
  let idxNoItems = 0;
  let idxNoDate = 0;
  let idxReconfirm = 0;
  let idxDeliveryNoAddr = 0;
  let idxUnavailable = 0;

  for (let i = 0; i < total; i++) {
    const status = shuffled[i] ?? "RASCUNHO";
    const customer = rng.sample(customers);
    const deliveryMethod =
      rng.randInt(0, 1) === 0 ? ("ENTREGA" as const) : ("RETIRADA" as const);
    const orderType =
      rng.randInt(0, 1) === 0
        ? ("PRONTA_ENTREGA" as const)
        : ("ENCOMENDA" as const);

    const forceNoItems = mode !== "bulk" && idxNoItems < goldenNoItems;
    const forceNoDate = mode !== "bulk" && idxNoDate < goldenNoDate;
    const forceReconfirm =
      mode !== "bulk" &&
      idxReconfirm < goldenReconfirm &&
      status !== "ENTREGUE" &&
      status !== "RASCUNHO" &&
      status !== "CANCELADO";
    const forceDeliveryNoAddr =
      mode !== "bulk" &&
      idxDeliveryNoAddr < goldenDeliveryNoAddr &&
      deliveryMethod === "ENTREGA";
    const forceUnavailable =
      mode !== "bulk" &&
      idxUnavailable < goldenUnavailable &&
      status !== "ENTREGUE" &&
      status !== "CANCELADO";

    let deliveryDatetime: Date | null = null;
    if (!forceNoDate) {
      deliveryDatetime = rng.randomDate(PERIOD_START, PERIOD_END);
    }

    const items: {
      sku: SkuRow;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];

    if (!forceNoItems) {
      if (forceUnavailable) {
        const sku = rng.sample(criticalSkus);
        const step = sku.quantityStep;
        const mult = sku.unitType === "KG" ? rng.randInt(2, 8) : rng.randInt(5, 20);
        const qty = Math.round((step * mult) * 1000) / 1000;
        const unitPrice = sku.priceCurrent;
        items.push({
          sku,
          quantity: qty,
          unitPrice,
          lineTotal: Math.round(qty * unitPrice * 100) / 100,
        });
      }
      const nExtra = forceUnavailable ? 0 : rng.randInt(1, 5);
      const pool =
        forceUnavailable || status === "ENTREGUE" ? nonCriticalSkus : skus;
      const used = new Set(items.map((it) => it.sku.id));
      for (let k = 0; k < nExtra; k++) {
        const sku = rng.sample(pool);
        if (used.has(sku.id)) continue;
        used.add(sku.id);
        const step = sku.quantityStep;
        const mult =
          sku.unitType === "KG" ? rng.randInt(1, 6) : rng.randInt(1, 10);
        const qty = Math.round(step * mult * 1000) / 1000;
        const unitPrice = sku.priceCurrent;
        items.push({
          sku,
          quantity: qty,
          unitPrice,
          lineTotal: Math.round(qty * unitPrice * 100) / 100,
        });
      }
    }

    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const deliveryFee =
      deliveryMethod === "ENTREGA" ? rng.randInt(0, 15) : 0;
    const total = subtotal + deliveryFee;

    let addressText: string | null = null;
    let addressCity: string | null = null;
    if (deliveryMethod === "ENTREGA" && !forceDeliveryNoAddr && customer.hasAddress) {
      addressText = `Rua ${customer.name}, 100`;
      addressCity = "São Paulo";
    }

    const refDate = deliveryDatetime ?? rng.randomDate(PERIOD_START, PERIOD_END);
    const year = refDate.getFullYear();
    const orderNumber = nextOrderNumber(counters, year);

    const confirmedAt =
      status !== "RASCUNHO" && status !== "CANCELADO"
        ? rng.randomDate(
            new Date(PERIOD_START.getTime() - 86400000 * 7),
            refDate
          )
        : null;
    const stockDecrementedAt =
      status === "ENTREGUE"
        ? rng.randomDate(
            refDate,
            new Date(refDate.getTime() + 86400000)
          )
        : null;
    const needsReconfirm = forceReconfirm;

    const createdAt = confirmedAt
      ? new Date(confirmedAt.getTime() - 86400000)
      : new Date(refDate.getTime() - 86400000 * 2);

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status,
          orderType,
          deliveryDatetime,
          deliveryTime: deliveryDatetime ? formatTime(deliveryDatetime) : null,
          deliveryMethod,
          addressText,
          addressCity,
          deliveryFee: toDecimal(deliveryFee),
          subtotal: toDecimal(subtotal),
          total: toDecimal(total),
          paymentMethod: "PIX",
          hasDeposit: false,
          notes: null,
          cancellationReason: status === "CANCELADO" ? "Cancelado sim" : null,
          confirmedAt,
          needsReconfirmation: needsReconfirm,
          paidAt:
            status === "ENTREGUE" && rng.randInt(0, 1) === 1 && stockDecrementedAt
              ? stockDecrementedAt
              : null,
          stockDecrementedAt,
          createdAt,
        },
      });
      if (items.length > 0) {
        await tx.orderItem.createMany({
          data: items.map((it) => ({
            orderId: o.id,
            skuId: it.sku.id,
            quantity: toDecimal(it.quantity),
            snapshotSkuName: it.sku.displayName,
            snapshotProductName: null,
            snapshotUnitLabel: it.sku.unitLabel,
            snapshotUnitType: it.sku.unitType,
            snapshotSizeText: it.sku.sizeText,
            snapshotFlavorText: it.sku.flavorText,
            snapshotIsFrozen: it.sku.isFrozen,
            snapshotUnitPrice: toDecimal(it.unitPrice),
            lineTotal: toDecimal(it.lineTotal),
          })),
        });
      }
      if (status === "ENTREGUE" && items.length > 0) {
        const at = stockDecrementedAt ?? new Date();
        for (const it of items) {
          await tx.productionConsumption.create({
            data: {
              skuId: it.sku.id,
              quantity: toDecimal(it.quantity),
              consumedAt: at,
              sourceType: "IMMEDIATE",
              note: `Entrega pedido ${orderNumber}`,
            },
          });
        }
      }
      return o;
    });
    orderIds.push(order.id);

    if (forceNoItems) idxNoItems++;
    if (forceNoDate) idxNoDate++;
    if (forceReconfirm) idxReconfirm++;
    if (forceDeliveryNoAddr) idxDeliveryNoAddr++;
    if (forceUnavailable) {
      unavailableOrderIds.push(order.id);
      idxUnavailable++;
    }
  }

  return {
    orderIds,
    unavailableOrderIds,
    noItemsCount: idxNoItems,
    noDateCount: idxNoDate,
    reconfirmCount: idxReconfirm,
    deliveryNoAddressCount: idxDeliveryNoAddr,
  };
}

async function syncStockQuantity(
  prisma: PrismaClient,
  skus: SkuRow[]
): Promise<void> {
  for (const sku of skus) {
    const [prod, cons] = await Promise.all([
      prisma.productionSessionItem.findMany({
        where: { skuId: sku.id },
        select: { quantity: true },
      }),
      prisma.productionConsumption.findMany({
        where: { skuId: sku.id },
        select: { quantity: true },
      }),
    ]);
    const produced = prod.reduce((s, i) => s + Number(i.quantity), 0);
    const consumed = cons.reduce((s, i) => s + Number(i.quantity), 0);
    const qty = Math.round((produced - consumed) * 1000) / 1000;
    await prisma.sku.update({
      where: { id: sku.id },
      data: {
        stockQuantity: toDecimal(qty),
      },
    });
  }
}

async function validate(
  prisma: PrismaClient,
  mode: Mode,
  stats: {
    noItems: number;
    noDate: number;
    reconfirm: number;
    deliveryNoAddress: number;
    plannedUnavailable: number;
  }
): Promise<void> {
  const enforceMinimums = mode !== "bulk";
  const orders = await prisma.order.findMany({
    include: {
      items: { select: { skuId: true, quantity: true } },
      customer: { select: { id: true } },
    },
  });

  const byStatus: Record<string, number> = {};
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
  }

  let entregueOk = 0;
  let canceladoOk = 0;
  let cancelReasonOnlyCancel = true;
  let confirmadoHasConfirm = true;
  let reconfirmCount = 0;
  let reconfirmNotEntregue = true;
  let incompleteOnlyNoItemsOrNoDate = true;

  for (const o of orders) {
    if (o.status === "ENTREGUE") {
      if (o.stockDecrementedAt) entregueOk++;
      else
        throw new Error(
          `Invariant: ENTREGUE sem stockDecrementedAt (order ${o.id})`
        );
    }
    if (o.status === "CANCELADO") {
      if (o.cancellationReason) canceladoOk++;
      else
        throw new Error(
          `Invariant: CANCELADO sem cancellationReason (order ${o.id})`
        );
    }
    if (o.status !== "CANCELADO" && o.cancellationReason) {
      cancelReasonOnlyCancel = false;
    }
    if (
      (o.status === "CONFIRMADO" ||
        o.status === "EM_PRODUCAO" ||
        o.status === "PRONTO" ||
        o.status === "ENTREGUE") &&
      !o.confirmedAt
    ) {
      confirmadoHasConfirm = false;
    }
    if (o.needsReconfirmation) {
      reconfirmCount++;
      if (o.status === "ENTREGUE") reconfirmNotEntregue = false;
    }
    const readiness = getOrderReadiness({
      deliveryDatetime: o.deliveryDatetime,
      items: o.items,
    });
    const pending = getOrderPendingSummary({
      deliveryDatetime: o.deliveryDatetime,
      items: o.items,
      needsReconfirmation: o.needsReconfirmation,
    });
    if (pending.incomplete && !(!readiness.hasItems || !readiness.hasDeliveryDate)) {
      incompleteOnlyNoItemsOrNoDate = false;
    }
  }

  if (!cancelReasonOnlyCancel) {
    throw new Error("Invariant: cancellationReason existe fora de CANCELADO");
  }
  if (!confirmadoHasConfirm) {
    throw new Error(
      "Invariant: pedido CONFIRMADO ou superior sem confirmedAt"
    );
  }
  if (!reconfirmNotEntregue) {
    throw new Error("Invariant: needsReconfirmation em ENTREGUE");
  }
  if (!incompleteOnlyNoItemsOrNoDate) {
    throw new Error(
      "Invariant: INCOMPLETE não apenas por sem itens ou sem data"
    );
  }
  if (enforceMinimums && reconfirmCount < MIN_RECONFIRM) {
    throw new Error(
      `Invariant: needsReconfirmation < ${MIN_RECONFIRM} (${reconfirmCount})`
    );
  }

  const inputs = orders.map((o) => ({
    id: o.id,
    status: o.status,
    items: o.items.map((i) => ({ skuId: i.skuId, quantity: i.quantity })),
  }));
  const unavMap = await computeUnavailableItemsForOrders(prisma, inputs);
  let unavCount = 0;
  for (const [oid, v] of unavMap) {
    if (v.hasUnavailableItems) unavCount++;
  }
  if (enforceMinimums && unavCount < UNAVAILABLE_ORDERS_TARGET) {
    throw new Error(
      `Invariant: pedidos indisponíveis ${unavCount} < ${UNAVAILABLE_ORDERS_TARGET}`
    );
  }

  const customersWithOrders = new Set(orders.map((o) => o.customer.id));
  const totalCustomers = await prisma.customer.count();
  if (enforceMinimums && totalCustomers < TOTAL_CUSTOMERS) {
    throw new Error(
      `Invariant: clientes ${totalCustomers} < ${TOTAL_CUSTOMERS}`
    );
  }
  const pct = totalCustomers ? customersWithOrders.size / totalCustomers : 0;
  if (enforceMinimums && pct < CUSTOMERS_WITH_ORDERS_PCT) {
    throw new Error(
      `Invariant: % clientes com pedido ${(pct * 100).toFixed(1)} < ${CUSTOMERS_WITH_ORDERS_PCT * 100}`
    );
  }

  const productCount = await prisma.product.count();
  if (enforceMinimums && productCount < TOTAL_PRODUCTS) {
    throw new Error(
      `Invariant: produtos ${productCount} < ${TOTAL_PRODUCTS}`
    );
  }
  const skuCount = await prisma.sku.count();
  const skuTypes = await prisma.sku.findMany({
    select: { unitType: true },
    distinct: ["unitType"],
  });
  if (
    enforceMinimums &&
    (!skuTypes.some((s) => s.unitType === "UNIDADE") ||
      !skuTypes.some((s) => s.unitType === "KG"))
  ) {
    throw new Error("Invariant: SKUs devem cobrir UNIDADE e KG");
  }

  console.log("\n--- Resumo ---");
  console.log("Status:", byStatus);
  console.log("Pendências: sem itens", stats.noItems, "| sem data", stats.noDate);
  console.log("needsReconfirmation:", reconfirmCount);
  console.log("Entrega sem endereço:", stats.deliveryNoAddress);
  console.log("Pedidos com item indisponível:", unavCount);
  console.log("Clientes:", totalCustomers, "| com pedido:", customersWithOrders.size);
  console.log("Produtos:", productCount, "| SKUs:", skuCount);
  console.log("Invariants OK.");
}

async function main() {
  const argv = process.argv.slice(2);
  const { mode, reset: doReset } = parseArgs(argv);
  console.log("seed-simulated", "mode=" + mode, doReset ? "| reset" : "");

  const prisma = new PrismaClient();
  const rng = prng(SEED);

  try {
    if (doReset) await reset(prisma);

    const dim = await createDimensions(prisma, rng);
    const customers = await createCustomers(prisma, rng);
    await createProductionAndConsumption(
      prisma,
      rng,
      dim.skus,
      dim.criticalProductIds
    );

    const orderStats = await createOrders(
      prisma,
      rng,
      customers,
      dim.skus,
      dim.criticalProductIds,
      mode
    );

    await syncStockQuantity(prisma, dim.skus);

    await validate(prisma, mode, {
      noItems: orderStats.noItemsCount,
      noDate: orderStats.noDateCount,
      reconfirm: orderStats.reconfirmCount,
      deliveryNoAddress: orderStats.deliveryNoAddressCount,
      plannedUnavailable: orderStats.unavailableOrderIds.length,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
