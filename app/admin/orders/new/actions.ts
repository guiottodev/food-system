"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { validateQtyByUnit } from "@/lib/quantity";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";

type CreateOrderPayload = {
  customer: {
    mode: "existing" | "new";
    customerId?: string;
    name?: string;
    phone?: string;
  };
  deliveryDatetime: string;
  deliveryMethod: "ENTREGA" | "RETIRADA";
  addressText?: string;
  addressBairro?: string;
  addressReferencia?: string;
  addressCity?: string;
  orderType: "PRONTA_ENTREGA" | "ENCOMENDA";
  deliveryFee?: number;
  items: Array<{
    skuId: string;
    quantity: number | string;
    priceAtTime: number;
  }>;
};

function parsePayload(formData: FormData): CreateOrderPayload {
  const raw = String(formData.get("payload") ?? "{}");
  return JSON.parse(raw) as CreateOrderPayload;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

async function generateOrderNumber(
  tx: Prisma.TransactionClient | typeof prisma
) {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const latest = await tx.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
  });
  const next =
    latest?.orderNumber?.startsWith(prefix)
      ? Number(latest.orderNumber.slice(prefix.length)) + 1
      : 1;
  return `${prefix}${String(next).padStart(6, "0")}`;
}

export async function createOrderAction(formData: FormData) {
  const payload = parsePayload(formData);
  if (!payload.items?.length) {
    redirect("/admin/orders/new?error=sem-itens");
  }

  if (!payload.deliveryDatetime) {
    redirect("/admin/orders/new?error=data-invalida");
  }

  if (
    payload.deliveryMethod === "ENTREGA" &&
    (!payload.addressText || !payload.addressText.trim())
  ) {
    redirect("/admin/orders/new?error=endereco-invalido");
  }

  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }
  const sessionData = verifySessionValue(session.value);
  const actor = sessionData
    ? await prisma.user.findUnique({
        where: { username: sessionData.username },
      })
    : null;

  const skuIds = payload.items.map((item) => item.skuId);
  const skus = await prisma.sku.findMany({
    where: {
      id: { in: skuIds },
      isActive: true,
      product: {
        isActive: true,
      },
    },
    include: {
      product: {
        select: {
          sobConsulta: true,
          name: true,
        },
      },
    },
  });
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  function normalizeQuantity(
    unitType: "KG" | "UNIDADE" | "CENTO",
    value: number | string
  ) {
    const result = validateQtyByUnit(unitType, value);
    if (!result.ok) {
      redirect("/admin/orders/new?error=quantidade-invalida");
    }
    return result.normalized;
  }

  const normalizedItems = payload.items.map((item) => {
    const sku = skuMap.get(item.skuId);
    if (!sku) {
      redirect("/admin/orders/new?error=sku-invalido");
    }
    const quantity = normalizeQuantity(sku.unitType, item.quantity);
    return { ...item, quantity, sku };
  });

  for (const item of normalizedItems) {
    const minQty = Number(item.sku.minQty);
    if (item.quantity < minQty) {
      redirect("/admin/orders/new?error=quantidade-invalida");
    }
  }

  const computedItems = normalizedItems.map((item) => {
    const quantity = item.quantity;
    const unitPrice = Number(item.sku.priceCurrent);
    const lineTotal = quantity * unitPrice;
    const snapshotIsSobConsulta =
      item.sku.sobConsultaOverride === true
        ? true
        : item.sku.sobConsultaOverride === false
        ? false
        : item.sku.product.sobConsulta;

    return {
      sku: item.sku,
      skuId: item.skuId,
      quantity,
      unitPrice,
      lineTotal,
      snapshot: {
        snapshotSkuName: item.sku.displayName,
        snapshotProductName: item.sku.product.name,
        snapshotUnitLabel: item.sku.unitLabel,
        snapshotUnitType: item.sku.unitType,
        snapshotSizeText: item.sku.sizeText || null,
        snapshotFlavorText: item.sku.flavorText || null,
        snapshotIsFrozen: item.sku.isFrozen,
        snapshotIsSobConsulta,
      },
    };
  });

  const deliveryFee = payload.deliveryFee ?? 0;
  const subtotal = computedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
  const total = subtotal + deliveryFee;

  let shouldConvert = false;
  if (payload.orderType === "PRONTA_ENTREGA") {
    for (const item of computedItems) {
      const available = Number(item.sku.stockQuantity ?? 0);
      if (available < item.quantity) {
        shouldConvert = true;
        break;
      }
    }
  }

  const finalOrderType = shouldConvert ? "ENCOMENDA" : payload.orderType;

  const result = await prisma.$transaction(async (tx) => {
    let customerId = payload.customer.customerId;
    if (payload.customer.mode === "new") {
      if (!payload.customer.name) {
        redirect("/admin/orders/new?error=cliente-invalido");
      }
      const customer = await tx.customer.create({
        data: {
          name: payload.customer.name,
          phone: payload.customer.phone || null,
        },
      });
      customerId = customer.id;
    }

    if (!customerId) {
      redirect("/admin/orders/new?error=cliente-invalido");
    }

    const orderNumber = await generateOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId,
        status: OrderStatus.NOVO,
        orderType: finalOrderType as OrderType,
        deliveryDatetime: new Date(payload.deliveryDatetime),
        deliveryMethod: payload.deliveryMethod,
        addressText: payload.addressText || null,
        addressBairro: payload.addressBairro || null,
        addressReferencia: payload.addressReferencia || null,
        addressCity: payload.addressCity || null,
        deliveryFee: toDecimal(deliveryFee),
        subtotal: toDecimal(subtotal),
        total: toDecimal(total),
        createdById: actor?.id ?? null,
      },
    });

    await tx.orderItem.createMany({
      data: computedItems.map((item) => ({
        orderId: order.id,
        skuId: item.skuId,
        quantity: toDecimal(item.quantity),
        snapshotSkuName: item.snapshot.snapshotSkuName,
        snapshotProductName: item.snapshot.snapshotProductName,
        snapshotUnitLabel: item.snapshot.snapshotUnitLabel,
        snapshotUnitType: item.snapshot.snapshotUnitType,
        snapshotSizeText: item.snapshot.snapshotSizeText,
        snapshotFlavorText: item.snapshot.snapshotFlavorText,
        snapshotIsFrozen: item.snapshot.snapshotIsFrozen,
        snapshotIsSobConsulta: item.snapshot.snapshotIsSobConsulta,
        snapshotUnitPrice: toDecimal(item.unitPrice),
        lineTotal: toDecimal(item.lineTotal),
      })),
    });

    await tx.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        entityType: "orders",
        entityId: order.id,
        action: "create_order",
        changes: `orderNumber=${order.orderNumber}`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        entityType: "orders",
        entityId: order.id,
        action: "create_items",
        changes: `items=${computedItems.length}`,
      },
    });

    if (shouldConvert) {
      await tx.auditLog.create({
        data: {
          actorId: actor?.id ?? null,
          entityType: "orders",
          entityId: order.id,
          action: "auto_convert_encomenda",
          changes: "Estoque insuficiente para pronta entrega.",
        },
      });
    }

    return { orderId: order.id, converted: shouldConvert };
  });

  const redirectUrl = result.converted
    ? `/admin/orders/${result.orderId}?converted=1`
    : `/admin/orders/${result.orderId}`;

  redirect(redirectUrl);
}
