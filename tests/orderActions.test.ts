import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  normalizeProductName,
  normalizeSkuDisplayName,
} from "@/lib/normalization";

class RedirectError extends Error {
  url: string;
  constructor(url: string) {
    super(`Redirected to ${url}`);
    this.url = url;
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "session" }),
  }),
}));

vi.mock("@/lib/session", () => ({
  verifySessionValue: () => ({ username: "tester" }),
}));

describe("order actions", () => {
  const dbPath = path.join(process.cwd(), "data", "test-order-actions.sqlite");
  const dbUrl = `file:${dbPath}`;
  let prisma: PrismaClient;
  let confirmOrderAction: (formData: FormData) => Promise<void>;
  let convertToEncomendaAction: (formData: FormData) => Promise<void>;

  beforeAll(async () => {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
    fs.writeFileSync(dbPath, "");
    execSync("npx prisma db push --force-reset --skip-generate", {
      env: { ...process.env, DATABASE_URL: dbUrl },
      stdio: "pipe",
    });
    process.env.DATABASE_URL = dbUrl;
    const prismaModule = await import("../lib/prisma");
    prisma = prismaModule.prisma;
    const actions = await import("../app/admin/orders/[id]/actions");
    confirmOrderAction = actions.confirmOrderAction;
    convertToEncomendaAction = actions.convertToEncomendaAction;
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.sku.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { username: "tester", name: "Tester" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath);
    }
  });

  async function createOrderBase() {
    const customer = await prisma.customer.create({
      data: { name: "Cliente", phone: "11999999999" },
    });
    const category = await prisma.category.create({
      data: { name: "Categoria", isActive: true },
    });
    const product = await prisma.product.create({
      data: {
        name: "Produto",
        nameNormalized: normalizeProductName("Produto"),
        categoryId: category.id,
        isActive: true,
      },
    });
    const sku = await prisma.sku.create({
      data: {
        productId: product.id,
        displayName: "SKU",
        displayNameNormalized: normalizeSkuDisplayName("SKU"),
        unitLabel: "un",
        unitType: "UNIDADE",
        quantityStep: 1,
        minQty: 1,
        priceCurrent: 10,
        isActive: true,
      },
    });
    return { customer, sku };
  }

  it("confirmOrderAction blocks when items are missing", async () => {
    const { customer } = await createOrderBase();
    const order = await prisma.order.create({
      data: {
        orderNumber: "TEST-0001",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: 0,
        total: 0,
      },
    });

    const formData = new FormData();
    formData.set("orderId", order.id);

    try {
      await confirmOrderAction(formData);
      throw new Error("expected redirect");
    } catch (error) {
      const redirectError = error as RedirectError;
      expect(redirectError.url).toContain("error=ready_items");
    }
  });

  it("confirmOrderAction blocks when date is missing", async () => {
    const { customer, sku } = await createOrderBase();
    const order = await prisma.order.create({
      data: {
        orderNumber: "TEST-0002",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: null,
        deliveryMethod: "RETIRADA",
        subtotal: 10,
        total: 10,
        items: {
          create: {
            skuId: sku.id,
            quantity: 1,
            snapshotSkuName: sku.displayName,
            snapshotProductName: "Produto",
            snapshotUnitLabel: "un",
            snapshotUnitType: "UNIDADE",
            snapshotUnitPrice: 10,
            lineTotal: 10,
          },
        },
      },
    });

    const formData = new FormData();
    formData.set("orderId", order.id);

    try {
      await confirmOrderAction(formData);
      throw new Error("expected redirect");
    } catch (error) {
      const redirectError = error as RedirectError;
      expect(redirectError.url).toContain("error=ready_date");
    }
  });

  it("confirmOrderAction confirms when ready", async () => {
    const { customer, sku } = await createOrderBase();
    const order = await prisma.order.create({
      data: {
        orderNumber: "TEST-0003",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: 10,
        total: 10,
        items: {
          create: {
            skuId: sku.id,
            quantity: 1,
            snapshotSkuName: sku.displayName,
            snapshotProductName: "Produto",
            snapshotUnitLabel: "un",
            snapshotUnitType: "UNIDADE",
            snapshotUnitPrice: 10,
            lineTotal: 10,
          },
        },
      },
    });

    const formData = new FormData();
    formData.set("orderId", order.id);

    try {
      await confirmOrderAction(formData);
    } catch (error) {
      const redirectError = error as RedirectError;
      expect(redirectError.url).toContain("confirmed=1");
    }

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe("CONFIRMADO");
    expect(updated?.confirmedAt).not.toBeNull();
  });

  it("convertToEncomendaAction updates the order type", async () => {
    const { customer } = await createOrderBase();
    const order = await prisma.order.create({
      data: {
        orderNumber: "TEST-0004",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "PRONTA_ENTREGA",
        deliveryDatetime: new Date("2026-01-20T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: 0,
        total: 0,
      },
    });

    const formData = new FormData();
    formData.set("orderId", order.id);

    try {
      await convertToEncomendaAction(formData);
    } catch (error) {
      const redirectError = error as RedirectError;
      expect(redirectError.url).toContain("converted=1");
    }

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.orderType).toBe("ENCOMENDA");
  });
});
