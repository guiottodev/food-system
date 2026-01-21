import { Prisma, PrismaClient } from "@prisma/client";

export const MIN_PHONE_DIGITS = 9;

export type CustomerValidationError = "name_required" | "phone_required" | "phone_invalid";
export type CustomerValidationResult =
  | { ok: true; name: string; phone: string }
  | { ok: false; error: CustomerValidationError };

export type CustomerListEntry = {
  id: string;
  name: string;
  phone: string;
  lastOrderDate: Date | null;
  orderCount: number;
};

export function normalizePhone(value: string) {
  return String(value ?? "").replace(/\D/g, "");
}

export function validateCustomerInput(
  name: string,
  phone: string,
  minDigits = MIN_PHONE_DIGITS
): CustomerValidationResult {
  const normalizedName = String(name ?? "").trim();
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedName) {
    return { ok: false, error: "name_required" as CustomerValidationError };
  }
  if (!normalizedPhone) {
    return { ok: false, error: "phone_required" as CustomerValidationError };
  }
  if (normalizedPhone.length < minDigits) {
    return { ok: false, error: "phone_invalid" as CustomerValidationError };
  }
  return { ok: true, name: normalizedName, phone: normalizedPhone };
}

export function buildCustomerSearchFilter(query: string): Prisma.CustomerWhereInput {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return {};
  const normalized = normalizePhone(trimmed);
  if (normalized) {
    return {
      OR: [
        { name: { contains: trimmed } },
        { phone: { contains: normalized } },
      ],
    };
  }
  return {
    name: {
      contains: trimmed,
    },
  };
}

export function buildCustomerListEntries(
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    orders: Array<{ deliveryDatetime: Date | null }>;
    _count: { orders: number };
  }>
): CustomerListEntry[] {
  const entries = customers.map((customer) => {
    const lastOrder = customer.orders.reduce<Date | null>((latest, order) => {
      if (!order.deliveryDatetime) return latest;
      if (!latest || order.deliveryDatetime > latest) {
        return order.deliveryDatetime;
      }
      return latest;
    }, null);
    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      lastOrderDate: lastOrder,
      orderCount: customer._count.orders,
    };
  });

  return entries.sort((a, b) => {
    if (!a.lastOrderDate && !b.lastOrderDate) return 0;
    if (!a.lastOrderDate) return 1;
    if (!b.lastOrderDate) return -1;
    return b.lastOrderDate.getTime() - a.lastOrderDate.getTime();
  });
}

export async function getCustomerOrders(
  prisma: PrismaClient,
  customerId: string,
  limit = 20
) {
  return prisma.order.findMany({
    where: { customerId },
    orderBy: { deliveryDatetime: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      deliveryDatetime: true,
      status: true,
      total: true,
    },
  });
}
