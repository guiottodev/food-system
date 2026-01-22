import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  buildCustomerListEntries,
  buildCustomerSearchFilter,
  getCustomerOrders,
  validateCustomerInput,
} from "../lib/domain/customer";
import { normalizePhoneBR, normalizePhoneDigits } from "../lib/phone";

describe("customer domain", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("validates required name and phone", () => {
    const missingName = validateCustomerInput("", "11999999999");
    expect(missingName.ok).toBe(false);
    if (!missingName.ok) {
      expect(missingName.error).toBe("name_required");
    }

    const missingPhone = validateCustomerInput("Ana", "");
    expect(missingPhone.ok).toBe(false);
    if (!missingPhone.ok) {
      expect(missingPhone.error).toBe("phone_required");
    }

    const invalidPhone = validateCustomerInput("Ana", "123");
    expect(invalidPhone.ok).toBe(false);
    if (!invalidPhone.ok) {
      expect(invalidPhone.error).toBe("phone_invalid");
    }
  });

  it("normalizes phone digits", () => {
    expect(normalizePhoneDigits("(11) 91234-5678")).toBe("11912345678");
  });

  it("normalizes BR phone format", () => {
    expect(normalizePhoneBR("(41) 99999-0000")).toBe("41999990000");
    expect(normalizePhoneBR("+55 (41) 99999-0000")).toBe("41999990000");
    expect(normalizePhoneBR("123")).toBeNull();
  });

  it("creates valid customer with normalized phone", async () => {
    const validation = validateCustomerInput("Ana", "(11) 91234-5678");
    expect(validation.ok).toBe(true);
    if (validation.ok) {
      const customer = await prisma.customer.create({
        data: {
          name: validation.name,
          phone: validation.phone,
        },
      });
      expect(customer.phone).toBe("11912345678");
    }
  });

  it("searches by name and phone digits", async () => {
    await prisma.customer.create({
      data: { name: "Maria", phone: "11999999999" },
    });
    await prisma.customer.create({
      data: { name: "Joao", phone: "21988887777" },
    });

    const byName = await prisma.customer.findMany({
      where: buildCustomerSearchFilter("Mari"),
    });
    expect(byName.length).toBe(1);
    expect(byName[0]?.name).toBe("Maria");

    const byPhone = await prisma.customer.findMany({
      where: buildCustomerSearchFilter("(21) 98888-7777"),
    });
    expect(byPhone.length).toBe(1);
    expect(byPhone[0]?.name).toBe("Joao");
  });

  it("computes customer order count and last order date", async () => {
    const customer = await prisma.customer.create({
      data: { name: "Cliente", phone: "11911112222" },
    });

    await prisma.order.create({
      data: {
        orderNumber: "TESTE-1",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-01-01T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(10),
        total: new Prisma.Decimal(10),
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: "TESTE-2",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-01-05T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(20),
        total: new Prisma.Decimal(20),
      },
    });

    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          select: { deliveryDatetime: true },
          orderBy: { deliveryDatetime: "desc" },
          take: 1,
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    const entries = buildCustomerListEntries(customers);
    expect(entries.length).toBe(1);
    expect(entries[0]?.orderCount).toBe(2);
    expect(entries[0]?.lastOrderDate?.toISOString()).toBe(
      "2026-01-05T10:00:00.000Z"
    );
  });

  it("returns customer orders in descending delivery date", async () => {
    const customer = await prisma.customer.create({
      data: { name: "Cliente", phone: "11933334444" },
    });
    const other = await prisma.customer.create({
      data: { name: "Outro", phone: "11955556666" },
    });

    await prisma.order.create({
      data: {
        orderNumber: "C-1",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-02-01T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(10),
        total: new Prisma.Decimal(10),
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: "C-2",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-02-10T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(20),
        total: new Prisma.Decimal(20),
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: "O-1",
        customerId: other.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-02-15T10:00:00Z"),
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(30),
        total: new Prisma.Decimal(30),
      },
    });

    const orders = await getCustomerOrders(prisma, customer.id, 20);
    expect(orders.length).toBe(2);
    expect(orders[0]?.orderNumber).toBe("C-2");
    expect(orders[1]?.orderNumber).toBe("C-1");
  });
});
