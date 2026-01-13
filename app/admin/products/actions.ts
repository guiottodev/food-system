"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseBool(value: FormDataEntryValue | null) {
  return value === "on";
}

function parseNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createProductAction(formData: FormData) {
  await requireAdminSession();
  const name = parseText(formData.get("name"));
  const categoryId = parseText(formData.get("categoryId"));
  const descriptionLong = parseText(formData.get("descriptionLong"));
  const leadTime = parseNumber(formData.get("leadTime"));
  const isActive = parseBool(formData.get("isActive"));
  const isPublicHidden = parseBool(formData.get("isPublicHidden"));
  const sobConsulta = parseBool(formData.get("sobConsulta"));
  const imageMainUrl = parseText(formData.get("imageMainUrl"));
  const imageExtraUrls = parseLines(formData.get("imageExtraUrls"));

  if (!name || !categoryId) {
    redirect("/admin/products?error=campos");
  }

  const product = await prisma.product.create({
    data: {
      name,
      categoryId,
      descriptionLong: descriptionLong || null,
      leadTime,
      isActive,
      isPublicHidden,
      sobConsulta,
      imageMainUrl: imageMainUrl || null,
    },
  });

  if (imageExtraUrls.length) {
    await prisma.productImage.createMany({
      data: imageExtraUrls.map((url, index) => ({
        productId: product.id,
        url,
        sortOrder: index,
      })),
    });
  }

  redirect(`/admin/products/${product.id}`);
}
