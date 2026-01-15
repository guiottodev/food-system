import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { transitionOrderStatus } from "../lib/domain/transitionOrderStatus";

const dbPath = path.join(process.cwd(), "data", "test-idempotency.sqlite");
const dbUrl = `file:${dbPath}`;

describe("stock idempotency", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: dbUrl, RUST_LOG: "debug" },
      stdio: "pipe",
    });
    prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
  });

  it("does not decrement stock twice for Entregue", async () => {
    const category = await prisma.category.create({
      data: { name: "Teste", isActive: true },
    });

    const product = await prisma.product.create({
      data: {
        name: "Produto teste",
        categoryId: category.id,
        isActive: true,
        isPublicHidden: false,
        sobConsulta: false,
      },
    });

    const sku = await prisma.sku.create({
      data: {
        productId: product.id,
        displayName: "SKU teste",
        sizeText: "un",
        unitLabel: "un",
        unitType: "UNIDADE",
        quantityStep: new Prisma.Decimal(1),
        minQty: new Prisma.Decimal(1),
        priceCurrent: new Prisma.Decimal(10),
        isActive: true,
        stockQuantity: new Prisma.Decimal(10),
      },
    });

    const customer = await prisma.customer.create({
      data: { name: "Cliente teste" },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: "TESTE-0001",
        customerId: customer.id,
        status: "NOVO",
        orderType: "PRONTA_ENTREGA",
        deliveryDatetime: new Date(),
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(20),
        total: new Prisma.Decimal(20),
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        skuId: sku.id,
        quantity: new Prisma.Decimal(2),
        snapshotSkuName: sku.displayName,
        snapshotProductName: product.name,
        snapshotUnitLabel: sku.unitLabel,
        snapshotUnitType: sku.unitType,
        snapshotUnitPrice: sku.priceCurrent,
        lineTotal: new Prisma.Decimal(20),
      },
    });

    await transitionOrderStatus(prisma, order.id, "EM_PRODUCAO", null);
    await transitionOrderStatus(prisma, order.id, "PRONTO", null);

    const first = await transitionOrderStatus(prisma, order.id, "ENTREGUE", null);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.appliedStock).toBe(false);
    }

    const afterFirst = await prisma.sku.findUnique({ where: { id: sku.id } });
    expect(Number(afterFirst?.stockQuantity)).toBe(10);

    const second = await transitionOrderStatus(prisma, order.id, "ENTREGUE", null);
    expect(second.ok).toBe(false);

    const afterSecond = await prisma.sku.findUnique({ where: { id: sku.id } });
    expect(Number(afterSecond?.stockQuantity)).toBe(10);

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });
    expect(finalOrder?.stockDecrementedAt).toBeNull();
  });
});
