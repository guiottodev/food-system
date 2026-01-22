import { Prisma, PrismaClient } from "@prisma/client";
import { type CustomerValidationError, validateCustomerInput } from "./customer";

export type CustomerCreateResult =
  | { ok: true; customerId: string; customerName: string }
  | {
      ok: false;
      error: CustomerValidationError | "CUSTOMER_PHONE_EXISTS";
      existingCustomerId?: string;
      existingCustomerName?: string;
    };

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export async function createCustomerWithPhone(
  prisma: PrismaClientLike,
  input: {
    name: string;
    phone: string;
    data?: Omit<Prisma.CustomerCreateInput, "name" | "phone">;
  }
): Promise<CustomerCreateResult> {
  const validation = validateCustomerInput(input.name, input.phone);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const existing = await prisma.customer.findUnique({
    where: { phone: validation.phone },
    select: { id: true, name: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "CUSTOMER_PHONE_EXISTS",
      existingCustomerId: existing.id,
      existingCustomerName: existing.name,
    };
  }

  const customer = await prisma.customer.create({
    data: {
      ...input.data,
      name: validation.name,
      phone: validation.phone,
    },
    select: { id: true, name: true },
  });

  return { ok: true, customerId: customer.id, customerName: customer.name };
}
