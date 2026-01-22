"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { createCustomerWithPhone } from "@/lib/domain/customerService";

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCustomerAction(formData: FormData) {
  await requireAdminSession();
  const name = parseText(formData.get("name"));
  const phone = parseText(formData.get("phone"));
  const document = parseText(formData.get("document"));
  const addressCep = parseText(formData.get("addressCep"));
  const addressStreet = parseText(formData.get("addressStreet"));
  const addressNumber = parseText(formData.get("addressNumber"));
  const addressComplement = parseText(formData.get("addressComplement"));
  const addressNeighborhood = parseText(formData.get("addressNeighborhood"));
  const addressCity = parseText(formData.get("addressCity"));
  const addressState = parseText(formData.get("addressState"));

  const result = await createCustomerWithPhone(prisma, {
    name,
    phone,
    data: {
      document: document || null,
      addressCep: addressCep || null,
      addressStreet: addressStreet || null,
      addressNumber: addressNumber || null,
      addressComplement: addressComplement || null,
      addressNeighborhood: addressNeighborhood || null,
      addressCity: addressCity || null,
      addressState: addressState || null,
    },
  });

  if (!result.ok) {
    if (result.error === "CUSTOMER_PHONE_EXISTS") {
      redirect(
        `/admin/clientes/novo?error=duplicado&existingId=${result.existingCustomerId}`
      );
    }
    redirect(`/admin/clientes/novo?error=${result.error}`);
  }

  redirect(`/admin/clientes/${result.customerId}?created=1`);
}
