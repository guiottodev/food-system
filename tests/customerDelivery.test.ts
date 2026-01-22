import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  applyCustomerDefaultAddressForOrder,
  getCustomerDeliveryAddress,
} from "../lib/domain/customerDelivery";
import { createCustomerWithPhone } from "../lib/domain/customerService";

describe("customer delivery address", () => {
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

  it("creates customer with normalized phone and detects duplicates", async () => {
    const created = await createCustomerWithPhone(prisma, {
      name: "Cliente",
      phone: "+55 (41) 99999-0000",
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      const stored = await prisma.customer.findUnique({
        where: { id: created.customerId },
      });
      expect(stored?.phone).toBe("41999990000");
    }

    const duplicate = await createCustomerWithPhone(prisma, {
      name: "Outro",
      phone: "41 99999-0000",
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error).toBe("CUSTOMER_PHONE_EXISTS");
      expect(duplicate.existingCustomerId).toBeDefined();
    }
  });

  it("returns customer default address when available", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente",
        phone: "11999990000",
        addressDefaultText: "Rua A, 123",
        addressDefaultCity: "Curitiba",
      },
    });

    const result = await getCustomerDeliveryAddress(prisma, customer.id);
    expect(result.source).toBe("customer_default");
    expect(result.address?.addressText).toBe("Rua A, 123");
    expect(result.address?.addressCity).toBe("Curitiba");
  });

  it("returns last order address when default is empty", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente",
        phone: "11999990001",
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: "ORD-1",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryDatetime: new Date("2026-01-05T10:00:00Z"),
        deliveryMethod: "ENTREGA",
        addressText: "Av Brasil, 10",
        addressCity: "Sao Paulo",
        subtotal: new Prisma.Decimal(10),
        total: new Prisma.Decimal(10),
      },
    });

    const result = await getCustomerDeliveryAddress(prisma, customer.id);
    expect(result.source).toBe("last_order");
    expect(result.address?.addressText).toBe("Av Brasil, 10");
  });

  it("returns none when no address is found", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente",
        phone: "11999990002",
      },
    });

    const result = await getCustomerDeliveryAddress(prisma, customer.id);
    expect(result.source).toBe("none");
    expect(result.address).toBeNull();
  });

  it("updates default address on new customer delivery", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente",
        phone: "11999990003",
      },
    });

    const applied = await applyCustomerDefaultAddressForOrder(prisma, {
      customerId: customer.id,
      deliveryMode: "ENTREGA",
      createdCustomer: true,
      saveAddressAsDefault: false,
      address: {
        addressText: "Rua Nova, 50",
        addressBairro: null,
        addressReferencia: null,
        addressCity: "Recife",
        addressCep: null,
      },
    });
    expect(applied).toBe(true);

    const updated = await prisma.customer.findUnique({
      where: { id: customer.id },
    });
    expect(updated?.addressDefaultText).toBe("Rua Nova, 50");
  });

  it("respects saveAddressAsDefault for existing customers", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente",
        phone: "11999990004",
        addressDefaultText: "Endereco antigo",
      },
    });

    const ignored = await applyCustomerDefaultAddressForOrder(prisma, {
      customerId: customer.id,
      deliveryMode: "ENTREGA",
      createdCustomer: false,
      saveAddressAsDefault: false,
      address: {
        addressText: "Endereco novo",
        addressBairro: null,
        addressReferencia: null,
        addressCity: "Natal",
        addressCep: null,
      },
    });
    expect(ignored).toBe(false);

    const unchanged = await prisma.customer.findUnique({
      where: { id: customer.id },
    });
    expect(unchanged?.addressDefaultText).toBe("Endereco antigo");

    const updated = await applyCustomerDefaultAddressForOrder(prisma, {
      customerId: customer.id,
      deliveryMode: "ENTREGA",
      createdCustomer: false,
      saveAddressAsDefault: true,
      address: {
        addressText: "Endereco novo",
        addressBairro: null,
        addressReferencia: null,
        addressCity: "Natal",
        addressCep: null,
      },
    });
    expect(updated).toBe(true);

    const refreshed = await prisma.customer.findUnique({
      where: { id: customer.id },
    });
    expect(refreshed?.addressDefaultText).toBe("Endereco novo");
  });

  it("does not update default address on pickup", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente",
        phone: "11999990005",
        addressDefaultText: "Endereco antigo",
      },
    });

    const applied = await applyCustomerDefaultAddressForOrder(prisma, {
      customerId: customer.id,
      deliveryMode: "RETIRADA",
      createdCustomer: true,
      saveAddressAsDefault: true,
      address: {
        addressText: "Endereco novo",
        addressBairro: null,
        addressReferencia: null,
        addressCity: "Natal",
        addressCep: null,
      },
    });
    expect(applied).toBe(false);

    const unchanged = await prisma.customer.findUnique({
      where: { id: customer.id },
    });
    expect(unchanged?.addressDefaultText).toBe("Endereco antigo");
  });
});
