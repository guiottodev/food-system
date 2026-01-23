import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  computeOrderPendingFlags,
  getCapacityRows,
  getProductCapacitySnapshot,
} from "../lib/domain/production";

describe("production capacity", () => {
  let prisma: PrismaClient;
  const dbPath = path.join(process.cwd(), "data", "test-production.sqlite");
  const dbUrl = `file:${dbPath}`;

  beforeAll(() => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    fs.writeFileSync(dbPath, "");
    execSync("npx prisma db push --force-reset --skip-generate", {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });
    prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
  });

  beforeEach(async () => {
    await prisma.productionSessionItem.deleteMany();
    await prisma.productionSession.deleteMany();
    await prisma.productionConsumption.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.sku.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
  });

  async function createProductWithSku(name: string) {
    const category = await prisma.category.create({
      data: { name: `Cat-${name}`, isActive: true },
    });
    const product = await prisma.product.create({
      data: {
        name,
        categoryId: category.id,
        isActive: true,
      },
    });
    const sku = await prisma.sku.create({
      data: {
        productId: product.id,
        displayName: `${name}-sku`,
        sizeText: "un",
        unitLabel: "un",
        unitType: "UNIDADE",
        quantityStep: new Prisma.Decimal(1),
        minQty: new Prisma.Decimal(1),
        priceCurrent: new Prisma.Decimal(10),
        isActive: true,
        stockQuantity: new Prisma.Decimal(0),
      },
    });
    return { category, product, sku };
  }

  async function createOrderWithItem(params: {
    customerId: string;
    skuId: string;
    productName: string;
    status: "RASCUNHO" | "CONFIRMADO" | "EM_PRODUCAO" | "PRONTO";
    deliveryDatetime: Date;
    quantity: number;
  }) {
    const customer = await prisma.customer.findUnique({
      where: { id: params.customerId },
    });
    if (!customer) {
      throw new Error("Customer not found");
    }
    const sku = await prisma.sku.findUnique({
      where: { id: params.skuId },
    });
    if (!sku) {
      throw new Error("SKU not found");
    }

    const created = await prisma.order.create({
      data: {
        orderNumber: `TEST-${Math.random().toString(36).slice(2, 6)}`,
        customerId: params.customerId,
        status: params.status,
        orderType: "ENCOMENDA",
        deliveryDatetime: params.deliveryDatetime,
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(params.quantity * 10),
        total: new Prisma.Decimal(params.quantity * 10),
        items: {
          create: {
            skuId: params.skuId,
            quantity: new Prisma.Decimal(params.quantity),
            snapshotSkuName: sku.displayName,
            snapshotProductName: params.productName,
            snapshotUnitLabel: sku.unitLabel,
            snapshotUnitType: sku.unitType,
            snapshotUnitPrice: sku.priceCurrent,
            lineTotal: new Prisma.Decimal(params.quantity * 10),
          },
        },
      },
    });
    return created.id;
  }

  it("computes demand and gap within the window", async () => {
    const { product, sku } = await createProductWithSku("Produto A");
    const customer = await prisma.customer.create({
      data: { name: "Cliente", phone: "11999999999" },
    });

    await prisma.productionSession.create({
      data: {
        producedAt: new Date(2026, 0, 1),
        items: {
          create: {
            skuId: sku.id,
            quantity: new Prisma.Decimal(10),
          },
        },
      },
    });

    await prisma.productionConsumption.create({
      data: {
        skuId: sku.id,
        quantity: new Prisma.Decimal(3),
        consumedAt: new Date(2026, 0, 1, 9, 0),
        sourceType: "IMMEDIATE",
      },
    });

    await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "CONFIRMADO",
      deliveryDatetime: new Date(2026, 0, 2, 10, 0),
      quantity: 5,
    });
    await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "EM_PRODUCAO",
      deliveryDatetime: new Date(2026, 0, 3, 10, 0),
      quantity: 2,
    });
    await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "RASCUNHO",
      deliveryDatetime: new Date(2026, 0, 4, 10, 0),
      quantity: 1,
    });
    await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "PRONTO",
      deliveryDatetime: new Date(2026, 0, 5, 10, 0),
      quantity: 4,
    });
    await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "CONFIRMADO",
      deliveryDatetime: new Date(2026, 0, 10, 10, 0),
      quantity: 6,
    });

    const snapshot = await getProductCapacitySnapshot(
      prisma,
      product.id,
      "7",
      new Date(2026, 0, 1, 9, 0)
    );

    expect(snapshot.produced).toBe(10);
    expect(snapshot.consumed).toBe(3);
    expect(snapshot.available).toBe(7);
    expect(snapshot.demand).toBe(8);
    expect(snapshot.gap).toBe(1);
  });

  it("filters capacity rows by gap", async () => {
    const { product: productA, sku: skuA } = await createProductWithSku("Produto A");
    const { product: productB, sku: skuB } = await createProductWithSku("Produto B");
    const customer = await prisma.customer.create({
      data: { name: "Cliente 2", phone: "11988887777" },
    });
    const baseDate = new Date();
    baseDate.setHours(10, 0, 0, 0);

    await prisma.productionSession.create({
      data: {
        producedAt: baseDate,
        items: {
          create: [
            { skuId: skuA.id, quantity: new Prisma.Decimal(2) },
            { skuId: skuB.id, quantity: new Prisma.Decimal(5) },
          ],
        },
      },
    });

    await createOrderWithItem({
      customerId: customer.id,
      skuId: skuB.id,
      productName: productB.name,
      status: "CONFIRMADO",
      deliveryDatetime: new Date(baseDate.getTime() + 86400000),
      quantity: 5,
    });

    await createOrderWithItem({
      customerId: customer.id,
      skuId: skuB.id,
      productName: productB.name,
      status: "EM_PRODUCAO",
      deliveryDatetime: new Date(baseDate.getTime() + 2 * 86400000),
      quantity: 1,
    });

    const rows = await getCapacityRows(prisma, {
      window: "7",
      gapOnly: true,
    });

    expect(rows.length).toBe(1);
    expect(rows[0]?.productName).toBe("Produto B");
  });

  it("flags unavailable items based on available now", async () => {
    const { product, sku } = await createProductWithSku("Produto C");
    const customer = await prisma.customer.create({
      data: { name: "Cliente 3", phone: "11977776666" },
    });

    await prisma.productionSession.create({
      data: {
        producedAt: new Date(),
        items: {
          create: {
            skuId: sku.id,
            quantity: new Prisma.Decimal(10),
          },
        },
      },
    });

    const orderId = await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "CONFIRMADO",
      deliveryDatetime: new Date(),
      quantity: 11,
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new Error("Order not found");
    }

    const pending = await computeOrderPendingFlags(prisma, {
      id: order.id,
      status: order.status,
      items: order.items,
    });

    expect(pending.hasUnavailableItems).toBe(true);

    await prisma.productionSession.create({
      data: {
        producedAt: new Date(),
        items: {
          create: {
            skuId: sku.id,
            quantity: new Prisma.Decimal(2),
          },
        },
      },
    });

    const pendingAfter = await computeOrderPendingFlags(prisma, {
      id: order.id,
      status: order.status,
      items: order.items,
    });

    expect(pendingAfter.hasUnavailableItems).toBe(false);
  });

  it("keeps unavailable when available is negative and ignores delivered/cancelled", async () => {
    const { product, sku } = await createProductWithSku("Produto D");
    const customer = await prisma.customer.create({
      data: { name: "Cliente 4", phone: "11911112223" },
    });

    await prisma.productionSession.create({
      data: {
        producedAt: new Date(),
        items: {
          create: {
            skuId: sku.id,
            quantity: new Prisma.Decimal(5),
          },
        },
      },
    });

    await prisma.productionConsumption.create({
      data: {
        skuId: sku.id,
        quantity: new Prisma.Decimal(8),
        consumedAt: new Date(),
        sourceType: "IMMEDIATE",
      },
    });

    const orderId = await createOrderWithItem({
      customerId: customer.id,
      skuId: sku.id,
      productName: product.name,
      status: "CONFIRMADO",
      deliveryDatetime: new Date(),
      quantity: 1,
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new Error("Order not found");
    }

    const pending = await computeOrderPendingFlags(prisma, {
      id: order.id,
      status: order.status,
      items: order.items,
    });

    expect(pending.hasUnavailableItems).toBe(true);

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "ENTREGUE" },
    });

    const deliveredPending = await computeOrderPendingFlags(prisma, {
      id: order.id,
      status: "ENTREGUE",
      items: order.items,
    });

    expect(deliveredPending.hasUnavailableItems).toBe(false);

    const cancelledPending = await computeOrderPendingFlags(prisma, {
      id: order.id,
      status: "CANCELADO",
      items: order.items,
    });

    expect(cancelledPending.hasUnavailableItems).toBe(false);
  });
});
