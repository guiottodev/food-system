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
import { createCustomerWithPhone } from "@/lib/domain/customerService";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { parseOrderPayment } from "@/lib/domain/orderPayment";
import { isSkuAvailableInternal } from "@/lib/skuAvailability";
import { OrderStatus, OrderType, Prisma } from "@prisma/client";

type DeliveryAddressPayload = {
  addressText?: string;
  addressBairro?: string;
  addressReferencia?: string;
  addressCity?: string;
  addressCep?: string;
};

type CreateOrderPayload = {
  status?: "RASCUNHO" | "CONFIRMADO";
  customerMode: "existing" | "new";
  customerId?: string;
  newCustomer?: {
    name?: string;
    phone?: string;
  };
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

function parsePayload(formData: FormData): CreateOrderPayload {
  const raw = String(formData.get("payload") ?? "{}");
  return JSON.parse(raw) as CreateOrderPayload;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function formatTimeValue(value: number) {
  return String(value).padStart(2, "0");
}

function parseSchedule(payload: CreateOrderPayload, orderType: OrderType) {
  if (orderType === "PRONTA_ENTREGA") {
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
    redirect("/admin/orders/new?error=data-invalida");
  }

  const scheduledAt = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(scheduledAt.getTime())) {
    redirect("/admin/orders/new?error=data-invalida");
  }

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startScheduled = new Date(year, month - 1, day);

  if (hasTime) {
    if (scheduledAt.getTime() <= Date.now()) {
      redirect("/admin/orders/new?error=data-passada");
    }
  } else if (startScheduled.getTime() < startToday.getTime()) {
    redirect("/admin/orders/new?error=data-passada");
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

export type CreateOrderResult =
  | { success: true; orderId: string }
  | { success: false; error?: string };

export async function createOrderAction(
  _prevState: CreateOrderResult | null,
  formData: FormData
): Promise<CreateOrderResult> {
  const payload = parsePayload(formData);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const availabilityBypass = String(formData.get("availabilityBypass") ?? "0") === "1";

  const finalOrderType: OrderType =
    payload.orderType === "PRONTA_ENTREGA" ? "PRONTA_ENTREGA" : "ENCOMENDA";
  const { scheduledAt, deliveryTime } = parseSchedule(payload, finalOrderType);

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

  const skuIds = items.map((item) => item.skuId);
  const skus = await prisma.sku.findMany({
    where: {
      id: { in: skuIds },
    },
    include: {
      product: {
        select: {
          name: true,
          isActive: true,
        },
      },
    },
  });
  const skuMap = new Map(skus.map((sku) => [sku.id, sku]));

  const normalizedItems = items.map((item) => {
    const sku = skuMap.get(item.skuId);
    if (!sku) {
      redirect("/admin/orders/new?error=sku-invalido");
    }
    if (!isSkuAvailableInternal({ sku, product: sku.product })) {
      redirect("/admin/orders/new?error=sku-invalido");
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
      redirect("/admin/orders/new?error=quantidade-invalida");
    }
    const quantity = quantityResult.normalized;
    return { ...item, quantity, sku };
  });

  // Validação de estoque para PRONTA_ENTREGA (apenas aviso, não bloqueia)
  // O cliente já mostra aviso antes do submit, então aqui apenas valida se bypass foi usado
  // Agora stockQuantity sempre reflete produced - consumed (sincronizado)
  // Não precisa mais verificar aqui - o cliente já fez a verificação

  function parseUnitPrice(value: unknown) {
    const parsed = Number(String(value ?? "").replace(",", "."));
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 0) return null;
    return parsed;
  }

  const computedItems = normalizedItems.map((item) => {
    const quantity = item.quantity;
    const payloadPrice = parseUnitPrice(item.priceAtTime);
    const unitPrice =
      payloadPrice !== null ? payloadPrice : Number(item.sku.priceCurrent);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      redirect("/admin/orders/new?error=preco-invalido");
    }
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
        redirect("/admin/orders/new?error=taxa-negativa");
      }
      redirect("/admin/orders/new?error=taxa-invalida");
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
      redirect("/admin/orders/new?error=pagamento-invalido");
    }
    redirect("/admin/orders/new?error=sinal-invalido");
  }

  const subtotal = computedItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
  const total = subtotal + deliveryFee;

  const normalizedAddress =
    deliveryMode === "ENTREGA" ? normalizeDeliveryAddress(payload.address) : null;

  const result = await prisma.$transaction(async (tx) => {
    let customerId =
      payload.customerMode === "existing" ? payload.customerId : undefined;
    let createdCustomer = false;

    if (payload.customerMode === "new") {
      const createResult = await createCustomerWithPhone(tx, {
        name: payload.newCustomer?.name ?? "",
        phone: payload.newCustomer?.phone ?? "",
      });
      if (!createResult.ok) {
        if (createResult.error === "CUSTOMER_PHONE_EXISTS") {
          const nameParam = encodeURIComponent(
            createResult.existingCustomerName ?? ""
          );
          redirect(
            `/admin/orders/new?error=cliente-telefone-existente&existingCustomerId=${createResult.existingCustomerId}&existingCustomerName=${nameParam}`
          );
        }
        redirect(
          `/admin/orders/new?error=${
            createResult.error === "name_required"
              ? "cliente-invalido"
              : "cliente-telefone"
          }`
        );
      }
      customerId = createResult.customerId;
      createdCustomer = true;
    }

    if (!customerId) {
      redirect("/admin/orders/new?error=cliente-invalido");
    }

    if (payload.customerMode === "existing") {
      const existing = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      });
      if (!existing) {
        redirect("/admin/orders/new?error=cliente-invalido");
      }
    }

    const orderNumber = await generateOrderNumber(tx);
    // Determinar status: usar do payload se fornecido, senão RASCUNHO
    const finalStatus = payload.status === "CONFIRMADO" 
      ? OrderStatus.CONFIRMADO 
      : OrderStatus.RASCUNHO;
    
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId,
        status: finalStatus,
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
        createdById: actor?.id ?? null,
      },
    });

    if (computedItems.length > 0) {
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
          snapshotUnitPrice: toDecimal(item.unitPrice),
          lineTotal: toDecimal(item.lineTotal),
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        entityType: "orders",
        entityId: order.id,
        action: "create_order",
        field: "orderNumber",
        beforeValue: null,
        afterValue: order.orderNumber,
      },
    });

    if (computedItems.length > 0) {
      await tx.auditLog.create({
        data: {
          actorId: actor?.id ?? null,
          entityType: "orders",
          entityId: order.id,
          action: "create_items",
          field: "items",
          beforeValue: "0",
          afterValue: String(computedItems.length),
        },
      });
    }

    await applyCustomerDefaultAddressForOrder(tx, {
      customerId,
      deliveryMode,
      createdCustomer,
      saveAddressAsDefault: Boolean(payload.saveAddressAsDefault),
      address: normalizedAddress,
    });

    return { orderId: order.id };
  });

  // Retornar sucesso para o cliente redirecionar; redirect() aqui lança e pode ser exibido como erro
  return { success: true, orderId: result.orderId };
}
