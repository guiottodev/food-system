"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { validateSkuQuantity } from "@/lib/quantity";
import {
  applyCustomerDefaultAddressForOrder,
  normalizeDeliveryAddress,
} from "@/lib/domain/customerDelivery";
import {
  DEFAULT_DELIVERY_TIME,
  shouldFlagReconfirmation,
  type OrderCriticalSnapshot,
} from "@/lib/domain/order";
import { parseOrderPayment } from "@/lib/domain/orderPayment";
import { isSkuAvailableInternal } from "@/lib/skuAvailability";
import { OrderType, Prisma } from "@prisma/client";

type DeliveryAddressPayload = {
  addressText?: string;
  addressBairro?: string;
  addressReferencia?: string;
  addressCity?: string;
  addressCep?: string;
};

type UpdateOrderPayload = {
  orderId: string;
  customerMode: "existing" | "new";
  customerId?: string;
  scheduleDate?: string;
  scheduleTime?: string;
  deliveryMode: "ENTREGA" | "RETIRADA";
  address?: DeliveryAddressPayload | null;
  saveAddressAsDefault?: boolean;
  orderType?: "PRONTA_ENTREGA" | "ENCOMENDA";
  deliveryFee?: number | string;
  paymentMethod?: string;
  hasDeposit?: boolean;
  depositAmount?: number | string;
  notes?: string;
  items: Array<{
    skuId: string;
    quantity: number | string;
    priceAtTime: number;
  }>;
};

function parsePayload(formData: FormData): UpdateOrderPayload {
  const raw = String(formData.get("payload") ?? "{}");
  return JSON.parse(raw) as UpdateOrderPayload;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function formatTimeValue(value: number) {
  return String(value).padStart(2, "0");
}

function parseSchedule(
  payload: UpdateOrderPayload,
  orderType: OrderType,
  current: { deliveryDatetime?: Date | null; deliveryTime?: string | null }
) {
  if (orderType === "PRONTA_ENTREGA") {
    if (current.deliveryDatetime) {
      return {
        scheduledAt: current.deliveryDatetime,
        deliveryTime: current.deliveryTime ?? DEFAULT_DELIVERY_TIME,
      } as const;
    }
    const now = new Date();
    return {
      scheduledAt: now,
      deliveryTime: `${formatTimeValue(now.getHours())}:${formatTimeValue(
        now.getMinutes()
      )}`,
    } as const;
  }

  const rawDate = payload.scheduleDate?.trim();
  if (!rawDate) {
    return { scheduledAt: null, deliveryTime: null } as const;
  }

  const rawTime = payload.scheduleTime?.trim();
  const hasTime = Boolean(rawTime);
  const parsedTime = rawTime || DEFAULT_DELIVERY_TIME;

  const [year, month, day] = rawDate.split("-").map((value) => Number(value));
  const [hour, minute] = parsedTime.split(":").map((value) => Number(value));
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    redirect(`/admin/orders/${payload.orderId}/edit?error=data-invalida`);
  }

  const scheduledAt = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(scheduledAt.getTime())) {
    redirect(`/admin/orders/${payload.orderId}/edit?error=data-invalida`);
  }

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startScheduled = new Date(year, month - 1, day);

  if (hasTime) {
    if (scheduledAt.getTime() <= Date.now()) {
      redirect(`/admin/orders/${payload.orderId}/edit?error=data-passada`);
    }
  } else if (startScheduled.getTime() < startToday.getTime()) {
    redirect(`/admin/orders/${payload.orderId}/edit?error=data-passada`);
  }

  return {
    scheduledAt,
    deliveryTime: hasTime ? rawTime : DEFAULT_DELIVERY_TIME,
  } as const;
}

function parseDeliveryFee(value: number | string | undefined | null) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { ok: true, value: 0 } as const;
  }

  const parsed = Number(String(value).replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return { ok: false, reason: "nao-numerica" } as const;
  }

  if (parsed < 0) {
    return { ok: false, reason: "negativa" } as const;
  }

  return { ok: true, value: parsed } as const;
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function normalizeDeliveryTime(value?: string | null) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized === DEFAULT_DELIVERY_TIME) return null;
  return normalized;
}

function normalizeNumber(value?: Prisma.Decimal | number | string | null) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatItemsSummary(items: Array<{ label: string; quantity: number }>) {
  if (items.length === 0) return "0 itens";
  const parts = items.map((item) => `${item.label} x${item.quantity}`);
  const summary = parts.join("; ");
  return summary.length > 140 ? `${items.length} itens` : summary;
}

export async function updateOrderAction(formData: FormData) {
  const payload = parsePayload(formData);
  const orderId = payload.orderId;
  if (!orderId) {
    redirect("/admin/orders");
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

  const items = Array.isArray(payload.items) ? payload.items : [];
  const skuIds = items.map((item) => item.skuId);
  const skus = await prisma.sku.findMany({
    where: { id: { in: skuIds } },
    include: { product: { select: { name: true, isActive: true } } },
  });
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  const normalizedItems = items.map((item) => {
    const sku = skuMap.get(item.skuId);
    if (!sku) {
      redirect(`/admin/orders/${orderId}/edit?error=sku-invalido`);
    }
    if (!isSkuAvailableInternal({ sku, product: sku.product })) {
      redirect(`/admin/orders/${orderId}/edit?error=sku-invalido`);
    }
    const quantityResult = validateSkuQuantity(
      {
        unitType: sku.unitType,
        minQty: sku.minQty,
        quantityStep: sku.quantityStep,
      },
      item.quantity
    );
    if (!quantityResult.ok) {
      redirect(`/admin/orders/${orderId}/edit?error=quantidade-invalida`);
    }
    const quantity = quantityResult.normalized;
    return { ...item, quantity, sku };
  });

  const computedItems = normalizedItems.map((item) => {
    const quantity = item.quantity;
    const unitPrice = Number(item.sku.priceCurrent);
    const lineTotal = quantity * unitPrice;
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
      },
    };
  });

  const deliveryMode =
    payload.deliveryMode === "ENTREGA" ? "ENTREGA" : "RETIRADA";
  let deliveryFee = 0;
  if (deliveryMode === "ENTREGA") {
    const feeResult = parseDeliveryFee(payload.deliveryFee);
    if (!feeResult.ok) {
      if (feeResult.reason === "negativa") {
        redirect(`/admin/orders/${orderId}/edit?error=taxa-negativa`);
      }
      redirect(`/admin/orders/${orderId}/edit?error=taxa-invalida`);
    }
    deliveryFee = feeResult.value;
  }

  const paymentResult = parseOrderPayment({
    paymentMethod: payload.paymentMethod,
    hasDeposit: payload.hasDeposit,
    depositAmount: payload.depositAmount,
  });
  if (!paymentResult.ok) {
    if (paymentResult.error === "payment_method_invalid") {
      redirect(`/admin/orders/${orderId}/edit?error=pagamento-invalido`);
    }
    redirect(`/admin/orders/${orderId}/edit?error=sinal-invalido`);
  }

  const subtotal = computedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
  const total = subtotal + deliveryFee;

  const normalizedAddress =
    deliveryMode === "ENTREGA" ? normalizeDeliveryAddress(payload.address) : null;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      redirect("/admin/orders");
    }

    const finalOrderType: OrderType =
      payload.orderType === "PRONTA_ENTREGA" ? "PRONTA_ENTREGA" : "ENCOMENDA";

    const { scheduledAt, deliveryTime } = parseSchedule(payload, finalOrderType, {
      deliveryDatetime: order.deliveryDatetime,
      deliveryTime: order.deliveryTime,
    });

    const beforeSnapshot: OrderCriticalSnapshot = {
      deliveryDatetime: order.deliveryDatetime,
      deliveryTime: order.deliveryTime,
      addressText: order.addressText,
      addressBairro: order.addressBairro,
      addressReferencia: order.addressReferencia,
      addressCity: order.addressCity,
      addressCep: order.addressCep,
      notes: order.notes,
      deliveryFee: order.deliveryFee,
      subtotal: order.subtotal,
      total: order.total,
      items: order.items.map((item) => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
    };

    const afterSnapshot: OrderCriticalSnapshot = {
      deliveryDatetime: scheduledAt,
      deliveryTime,
      addressText:
        deliveryMode === "ENTREGA"
          ? normalizedAddress?.addressText ?? null
          : null,
      addressBairro:
        deliveryMode === "ENTREGA"
          ? normalizedAddress?.addressBairro ?? null
          : null,
      addressReferencia:
        deliveryMode === "ENTREGA"
          ? normalizedAddress?.addressReferencia ?? null
          : null,
      addressCity:
        deliveryMode === "ENTREGA"
          ? normalizedAddress?.addressCity ?? null
          : null,
      addressCep:
        deliveryMode === "ENTREGA"
          ? normalizedAddress?.addressCep ?? null
          : null,
      notes: payload.notes?.trim() || null,
      deliveryFee: deliveryFee,
      subtotal: subtotal,
      total: total,
      items: computedItems.map((item) => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
    };

    const shouldReconfirm = shouldFlagReconfirmation(
      order.status,
      beforeSnapshot,
      afterSnapshot
    );

    const auditEntries: Array<{
      actorId: string | null;
      entityType: string;
      entityId: string;
      action: string;
      field?: string | null;
      beforeValue?: string | null;
      afterValue?: string | null;
      reason?: string | null;
      changes?: string | null;
    }> = [];

    const pushChange = (
      field: string,
      beforeValue: unknown,
      afterValue: unknown
    ) => {
      const before = beforeValue ?? "";
      const after = afterValue ?? "";
      if (String(before) === String(after)) return;
      auditEntries.push({
        actorId: actor?.id ?? null,
        entityType: "orders",
        entityId: orderId,
        action: "order_update",
        field,
        beforeValue: String(before || ""),
        afterValue: String(after || ""),
      });
    };

    pushChange("orderType", order.orderType, finalOrderType);
    pushChange("deliveryMethod", order.deliveryMethod, deliveryMode);
    pushChange(
      "deliveryDatetime",
      order.deliveryDatetime?.toISOString() ?? "",
      scheduledAt?.toISOString() ?? ""
    );
    pushChange(
      "deliveryTime",
      normalizeDeliveryTime(order.deliveryTime) ?? "",
      normalizeDeliveryTime(deliveryTime) ?? ""
    );
    pushChange("addressText", order.addressText, normalizedAddress?.addressText);
    pushChange(
      "addressBairro",
      order.addressBairro,
      normalizedAddress?.addressBairro
    );
    pushChange(
      "addressReferencia",
      order.addressReferencia,
      normalizedAddress?.addressReferencia
    );
    pushChange("addressCity", order.addressCity, normalizedAddress?.addressCity);
    pushChange("addressCep", order.addressCep, normalizedAddress?.addressCep);
    pushChange("deliveryFee", normalizeNumber(order.deliveryFee), deliveryFee);
    pushChange("subtotal", normalizeNumber(order.subtotal), subtotal);
    pushChange("total", normalizeNumber(order.total), total);
    pushChange("notes", order.notes, payload.notes?.trim() || null);

    const beforeItemsSummary = formatItemsSummary(
      order.items.map((item) => ({
        label: item.snapshotSkuName,
        quantity: Number(item.quantity),
      }))
    );
    const afterItemsSummary = formatItemsSummary(
      computedItems.map((item) => ({
        label: item.snapshot.snapshotSkuName,
        quantity: item.quantity,
      }))
    );
    pushChange("items", beforeItemsSummary, afterItemsSummary);

    await tx.order.update({
      where: { id: orderId },
      data: {
        orderType: finalOrderType,
        deliveryDatetime: scheduledAt,
        deliveryTime,
        deliveryMethod: deliveryMode,
        addressText:
          deliveryMode === "ENTREGA"
            ? normalizedAddress?.addressText ?? null
            : null,
        addressBairro:
          deliveryMode === "ENTREGA"
            ? normalizedAddress?.addressBairro ?? null
            : null,
        addressReferencia:
          deliveryMode === "ENTREGA"
            ? normalizedAddress?.addressReferencia ?? null
            : null,
        addressCity:
          deliveryMode === "ENTREGA"
            ? normalizedAddress?.addressCity ?? null
            : null,
        addressCep:
          deliveryMode === "ENTREGA"
            ? normalizedAddress?.addressCep ?? null
            : null,
        deliveryFee: toDecimal(deliveryFee),
        subtotal: toDecimal(subtotal),
        total: toDecimal(total),
        paymentMethod: paymentResult.paymentMethod ?? null,
        hasDeposit: paymentResult.hasDeposit,
        depositAmount:
          paymentResult.depositAmount !== null
            ? toDecimal(paymentResult.depositAmount)
            : null,
        notes: payload.notes?.trim() || null,
        needsReconfirmation: shouldReconfirm ? true : order.needsReconfirmation,
      },
    });

    await tx.orderItem.deleteMany({ where: { orderId } });
    if (computedItems.length > 0) {
      await tx.orderItem.createMany({
        data: computedItems.map((item) => ({
          orderId,
          skuId: item.skuId,
          quantity: toDecimal(item.quantity),
          snapshotSkuName: item.snapshot.snapshotSkuName,
          snapshotProductName: item.snapshot.snapshotProductName,
          snapshotUnitLabel: item.snapshot.snapshotUnitLabel,
          snapshotUnitType: item.snapshot.snapshotUnitType,
          snapshotSizeText: item.snapshot.snapshotSizeText,
          snapshotFlavorText: item.snapshot.snapshotFlavorText,
          snapshotIsFrozen: item.snapshot.snapshotIsFrozen,
          snapshotUnitPrice: toDecimal(item.unitPrice),
          lineTotal: toDecimal(item.lineTotal),
        })),
      });
    }

    if (shouldReconfirm && !order.needsReconfirmation) {
      auditEntries.push({
        actorId: actor?.id ?? null,
        entityType: "orders",
        entityId: orderId,
        action: "flag_reconfirm",
        field: "needsReconfirmation",
        beforeValue: "false",
        afterValue: "true",
      });
    }

    if (auditEntries.length > 0) {
      await tx.auditLog.createMany({ data: auditEntries });
    }

    await applyCustomerDefaultAddressForOrder(tx, {
      customerId: order.customerId,
      deliveryMode,
      createdCustomer: false,
      saveAddressAsDefault: Boolean(payload.saveAddressAsDefault),
      address: normalizedAddress,
    });
  });

  redirect(`/admin/orders/${orderId}?updated=1`);
}
