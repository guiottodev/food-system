import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OrderForm from "../app/admin/orders/new/OrderForm";
import { parseOrderPayment } from "../lib/domain/orderPayment";

describe("order payment", () => {
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

  it("saves payment method and deposit", async () => {
    const customer = await prisma.customer.create({
      data: {
        name: "Cliente Teste",
        phone: "41999990000",
      },
    });

    const parsed = parseOrderPayment({
      paymentMethod: "PIX",
      hasDeposit: true,
      depositAmount: "15.5",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const order = await prisma.order.create({
      data: {
        orderNumber: "2026-000001",
        customerId: customer.id,
        status: "RASCUNHO",
        orderType: "ENCOMENDA",
        deliveryMethod: "RETIRADA",
        subtotal: new Prisma.Decimal(20),
        total: new Prisma.Decimal(20),
        paymentMethod: parsed.paymentMethod,
        hasDeposit: parsed.hasDeposit,
        depositAmount: new Prisma.Decimal(parsed.depositAmount ?? 0),
      },
    });

    const stored = await prisma.order.findUnique({ where: { id: order.id } });
    expect(stored?.paymentMethod).toBe("PIX");
    expect(stored?.hasDeposit).toBe(true);
    expect(Number(stored?.depositAmount)).toBeCloseTo(15.5, 2);
  });

  it("rejects zero deposit amount", () => {
    const result = parseOrderPayment({
      paymentMethod: "DINHEIRO",
      hasDeposit: true,
      depositAmount: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("deposit_invalid");
    }
  });

  it("renders payment block", () => {
    const html = renderToStaticMarkup(createElement(OrderForm, { customers: [] }));
    expect(html).toContain("A combinar");
  });
});
