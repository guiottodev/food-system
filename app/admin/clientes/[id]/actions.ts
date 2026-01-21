"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { normalizePhone, validateCustomerInput } from "@/lib/domain/customer";

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function updateCustomerAction(formData: FormData) {
  await requireAdminSession();
  const id = parseText(formData.get("id"));
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

  if (!id) {
    redirect("/admin/clientes");
  }

  const validation = validateCustomerInput(name, phone);
  if (!validation.ok) {
    redirect(`/admin/clientes/${id}?error=${validation.error}`);
  }

  const normalizedPhone = normalizePhone(validation.phone ?? "");
  const existing = await prisma.customer.findFirst({
    where: {
      phone: normalizedPhone,
      NOT: { id },
    },
  });
  if (existing) {
    redirect(`/admin/clientes/${id}?error=duplicado&existingId=${existing.id}`);
  }

  await prisma.customer.update({
    where: { id },
    data: {
      name: validation.name,
      phone: normalizedPhone,
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

  redirect(`/admin/clientes/${id}?saved=1`);
}
