import { Prisma, PrismaClient } from "@prisma/client";

export type DeliveryAddress = {
  addressText: string | null;
  addressBairro: string | null;
  addressReferencia: string | null;
  addressCity: string | null;
  addressCep: string | null;
};

export type DeliveryAddressSource = "customer_default" | "last_order" | "none";

function normalizeField(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeDeliveryAddress(
  address?: Partial<DeliveryAddress> | null
): DeliveryAddress | null {
  if (!address) return null;
  const normalized: DeliveryAddress = {
    addressText: normalizeField(address.addressText),
    addressBairro: normalizeField(address.addressBairro),
    addressReferencia: normalizeField(address.addressReferencia),
    addressCity: normalizeField(address.addressCity),
    addressCep: normalizeField(address.addressCep),
  };
  const hasAny = Object.values(normalized).some((value) => Boolean(value));
  return hasAny ? normalized : null;
}

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export async function getCustomerDeliveryAddress(
  prisma: PrismaClientLike,
  customerId: string
): Promise<{ address: DeliveryAddress | null; source: DeliveryAddressSource }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      addressDefaultText: true,
      addressDefaultBairro: true,
      addressDefaultReferencia: true,
      addressDefaultCity: true,
      addressDefaultCep: true,
    },
  });

  const defaultAddress = normalizeDeliveryAddress(
    customer
      ? {
          addressText: customer.addressDefaultText,
          addressBairro: customer.addressDefaultBairro,
          addressReferencia: customer.addressDefaultReferencia,
          addressCity: customer.addressDefaultCity,
          addressCep: customer.addressDefaultCep,
        }
      : null
  );

  if (defaultAddress) {
    return { address: defaultAddress, source: "customer_default" };
  }

  const lastOrder = await prisma.order.findFirst({
    where: {
      customerId,
      NOT: { addressText: null },
      AND: { NOT: { addressText: "" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      addressText: true,
      addressBairro: true,
      addressReferencia: true,
      addressCity: true,
      addressCep: true,
    },
  });

  const lastOrderAddress = normalizeDeliveryAddress(lastOrder);
  if (lastOrderAddress) {
    return { address: lastOrderAddress, source: "last_order" };
  }

  return { address: null, source: "none" };
}

export async function updateCustomerDefaultAddress(
  prisma: PrismaClientLike,
  customerId: string,
  address: DeliveryAddress | null
) {
  const normalized = normalizeDeliveryAddress(address);
  if (!normalized) return;
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      addressDefaultText: normalized.addressText,
      addressDefaultBairro: normalized.addressBairro,
      addressDefaultReferencia: normalized.addressReferencia,
      addressDefaultCity: normalized.addressCity,
      addressDefaultCep: normalized.addressCep,
    },
  });
}

export async function applyCustomerDefaultAddressForOrder(
  prisma: PrismaClientLike,
  input: {
    customerId: string;
    deliveryMode: "ENTREGA" | "RETIRADA";
    createdCustomer: boolean;
    saveAddressAsDefault: boolean;
    address: DeliveryAddress | null;
  }
) {
  if (input.deliveryMode !== "ENTREGA") return false;
  if (!input.createdCustomer && !input.saveAddressAsDefault) return false;
  await updateCustomerDefaultAddress(prisma, input.customerId, input.address);
  return true;
}
