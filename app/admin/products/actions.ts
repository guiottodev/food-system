"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { getSkuDefaults, normalizeUnitType } from "@/lib/unit";
import { validateSkuQuantity } from "@/lib/quantity";

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

async function assertLeafCategoryOrRedirect(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, isActive: true, parentId: true },
  });
  if (!category || !category.isActive) {
    redirect("/admin/products/new?error=campos");
  }

  // Checar se é folha (sem filhos)
  const childCount = await prisma.category.count({
    where: { parentId: categoryId },
  });
  if (childCount > 0) {
    redirect("/admin/products/new?error=campos");
  }

  // Checar se todos os ancestrais estão ativos
  let currentParentId = category.parentId;
  while (currentParentId) {
    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { id: true, isActive: true, parentId: true },
    });
    if (!parent || !parent.isActive) {
      redirect("/admin/products/new?error=campos");
    }
    currentParentId = parent.parentId;
  }
}

export async function createProductAction(formData: FormData) {
  await requireAdminSession();
  const name = parseText(formData.get("name"));
  const categoryId = parseText(formData.get("categoryId"));
  const descriptionLong = parseText(formData.get("descriptionLong"));
  const leadTime = parseNumber(formData.get("leadTime"));
  const isActive = parseBool(formData.get("isActive"));
  const imageMainUrl = parseText(formData.get("imageMainUrl"));
  const imageExtraUrls = parseLines(formData.get("imageExtraUrls"));
  const skuDisplayName = parseText(formData.get("skuDisplayName"));
  const skuUnitTypeRaw = parseText(formData.get("skuUnitType"));
  const skuPriceCurrent = parseNumber(formData.get("skuPriceCurrent"));
  const skuIsActive = parseBool(formData.get("skuIsActive"));

  if (!name || !categoryId) {
    redirect("/admin/products/new?error=campos");
  }

  await assertLeafCategoryOrRedirect(categoryId);

  if (!skuDisplayName || !skuUnitTypeRaw || skuPriceCurrent === null) {
    redirect("/admin/products/new?error=sku_campos");
  }
  if (skuPriceCurrent !== null && skuPriceCurrent < 0) {
    redirect("/admin/products/new?error=sku_preco");
  }

  let unitType: "UNIDADE" | "KG";
  try {
    unitType = normalizeUnitType(skuUnitTypeRaw);
  } catch {
    redirect("/admin/products/new?error=sku_unit");
    return;
  }

  const defaults = getSkuDefaults(unitType);
  const qtyValidation = validateSkuQuantity(
    {
      unitType,
      minQty: defaults.minQty,
      quantityStep: defaults.quantityStep,
    },
    defaults.minQty
  );
  if (!qtyValidation.ok) {
    redirect("/admin/products/new?error=sku_quantidade");
  }

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name,
        categoryId,
        descriptionLong: descriptionLong || null,
        leadTime,
        isActive,
        imageMainUrl: imageMainUrl || null,
      },
    });

    await tx.sku.create({
      data: {
        productId: created.id,
        displayName: skuDisplayName,
        sizeText: "",
        flavorText: null,
        isFrozen: false,
        unitType,
        unitLabel: defaults.unitLabel,
        quantityStep: defaults.quantityStep,
        minQty: defaults.minQty,
        priceCurrent: skuPriceCurrent ?? 0,
        cost: null,
        attributesJson: null,
        isActive: skuIsActive,
      },
    });

    if (imageExtraUrls.length) {
      await tx.productImage.createMany({
        data: imageExtraUrls.map((url, index) => ({
          productId: created.id,
          url,
          sortOrder: index,
        })),
      });
    }

    return created;
  });

  redirect(`/admin/products/${product.id}?created=1&tab=skus`);
}

export async function updateSkuPriceAction(
  skuId: string,
  price: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminSession();
  if (!skuId || typeof skuId !== "string" || !skuId.trim()) {
    return { ok: false, error: "SKU inválido" };
  }
  if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
    return { ok: false, error: "Preço inválido" };
  }
  const sku = await prisma.sku.findUnique({
    where: { id: skuId.trim() },
    select: { id: true },
  });
  if (!sku) {
    return { ok: false, error: "SKU não encontrado" };
  }
  await prisma.sku.update({
    where: { id: skuId.trim() },
    data: { priceCurrent: price },
  });
  return { ok: true };
}
