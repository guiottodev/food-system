"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { getSkuDefaults, normalizeUnitType } from "@/lib/unit";
import { validateSkuQuantity } from "@/lib/quantity";
import {
  validateSkuAttributes,
  type SkuAttributeInput,
} from "@/lib/validation/skuAttributes";

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

function parseTags(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function assertLeafCategoryOrRedirect(categoryId: string, productId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, isActive: true, parentId: true },
  });
  if (!category || !category.isActive) {
    redirect(`/admin/products/${productId}?tab=details&error=campos`);
  }

  const childCount = await prisma.category.count({
    where: { parentId: categoryId },
  });
  if (childCount > 0) {
    redirect(`/admin/products/${productId}?tab=details&error=campos`);
  }

  let currentParentId = category.parentId;
  while (currentParentId) {
    const parent = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { id: true, isActive: true, parentId: true },
    });
    if (!parent || !parent.isActive) {
      redirect(`/admin/products/${productId}?tab=details&error=campos`);
    }
    currentParentId = parent.parentId;
  }
}

function parseAttributesJson(
  value: FormDataEntryValue | null
): SkuAttributeInput[] | null {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item) => ({
      key: String(item?.key ?? ""),
      value: String(item?.value ?? ""),
    }));
  } catch {
    return null;
  }
}

export async function updateProductAction(formData: FormData) {
  await requireAdminSession();
  const id = parseText(formData.get("id"));
  const name = parseText(formData.get("name"));
  const categoryId = parseText(formData.get("categoryId"));
  const descriptionLong = parseText(formData.get("descriptionLong"));
  const hasLeadTime = formData.has("leadTime");
  const leadTime = hasLeadTime ? parseNumber(formData.get("leadTime")) : null;
  const isActive = parseBool(formData.get("isActive"));
  const hasImageMainUrl = formData.has("imageMainUrl");
  const hasImageExtraUrls = formData.has("imageExtraUrls");
  const imageMainUrl = hasImageMainUrl
    ? parseText(formData.get("imageMainUrl"))
    : "";
  const imageExtraUrls = hasImageExtraUrls
    ? parseLines(formData.get("imageExtraUrls"))
    : [];

  if (!id || !name || !categoryId) {
    redirect(`/admin/products/${id}?tab=details&error=campos`);
  }

  await assertLeafCategoryOrRedirect(categoryId, id);

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        descriptionLong: descriptionLong || null,
        ...(hasLeadTime ? { leadTime } : {}),
        isActive,
        ...(hasImageMainUrl ? { imageMainUrl: imageMainUrl || null } : {}),
      },
    });

    if (hasImageExtraUrls) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (imageExtraUrls.length) {
        await tx.productImage.createMany({
          data: imageExtraUrls.map((url, index) => ({
            productId: id,
            url,
            sortOrder: index,
          })),
        });
      }
    }
  });

  redirect(`/admin/products/${id}?tab=details`);
}

export async function createSkuAction(formData: FormData) {
  await requireAdminSession();
  const productId = parseText(formData.get("productId"));
  const displayName = parseText(formData.get("displayName"));
  const sizeText = parseText(formData.get("sizeText"));
  const flavorText = parseText(formData.get("flavorText"));
  const unitTypeRaw = parseText(formData.get("unitType"));
  const priceCurrent = parseNumber(formData.get("priceCurrent"));
  const cost = parseNumber(formData.get("cost"));
  const isFrozen = parseBool(formData.get("isFrozen"));
  const isActive = parseBool(formData.get("isActive"));
  const tags = parseTags(formData.get("tags"));
  const attributesInput = parseAttributesJson(
    formData.get("attributesJson")
  );

  if (!productId || !displayName || !unitTypeRaw || !priceCurrent) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_campos&skuMode=new`
    );
  }

  let unitType: "UNIDADE" | "CENTO" | "KG";
  try {
    unitType = normalizeUnitType(unitTypeRaw);
  } catch {
    redirect(`/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=new`);
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
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_quantidade&skuMode=new`
    );
  }

  if (attributesInput === null) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=new`
    );
  }
  const attributesValidation = validateSkuAttributes(attributesInput);
  if (!attributesValidation.ok) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=new`
    );
  }

  const attributesJson = attributesValidation.normalized.length
    ? attributesValidation.json
    : null;

  const activeBefore = await prisma.sku.count({
    where: { productId, isActive: true },
  });

  await prisma.$transaction(async (tx) => {
    const sku = await tx.sku.create({
      data: {
        productId,
        displayName,
        sizeText: sizeText || "",
        flavorText: flavorText || null,
        isFrozen,
        unitType,
        unitLabel: defaults.unitLabel,
        quantityStep: defaults.quantityStep,
        minQty: defaults.minQty,
        priceCurrent,
        cost: cost ?? null,
        attributesJson,
        isActive,
      },
    });

    if (tags.length) {
      await tx.skuTag.createMany({
        data: tags.map((name) => ({
          skuId: sku.id,
          name,
        })),
      });
    }
  });

  const shouldShowReady = activeBefore === 0 && isActive;
  redirect(
    `/admin/products/${productId}?tab=skus${shouldShowReady ? "&ready=1" : ""}`
  );
}

export async function updateSkuAction(formData: FormData) {
  await requireAdminSession();
  const productId = parseText(formData.get("productId"));
  const skuId = parseText(formData.get("skuId"));
  const displayName = parseText(formData.get("displayName"));
  const sizeText = parseText(formData.get("sizeText"));
  const flavorText = parseText(formData.get("flavorText"));
  const unitTypeRaw = parseText(formData.get("unitType"));
  const priceCurrent = parseNumber(formData.get("priceCurrent"));
  const cost = parseNumber(formData.get("cost"));
  const isFrozen = parseBool(formData.get("isFrozen"));
  const isActive = parseBool(formData.get("isActive"));
  const tags = parseTags(formData.get("tags"));
  const attributesInput = parseAttributesJson(
    formData.get("attributesJson")
  );

  if (!productId || !skuId || !displayName || !unitTypeRaw || !priceCurrent) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_campos&skuMode=edit&skuId=${skuId}`
    );
  }

  let unitType: "UNIDADE" | "CENTO" | "KG";
  try {
    unitType = normalizeUnitType(unitTypeRaw);
  } catch {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=edit&skuId=${skuId}`
    );
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
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_quantidade&skuMode=edit&skuId=${skuId}`
    );
  }

  if (attributesInput === null) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=edit&skuId=${skuId}`
    );
  }
  const attributesValidation = validateSkuAttributes(attributesInput);
  if (!attributesValidation.ok) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=edit&skuId=${skuId}`
    );
  }

  const attributesJson = attributesValidation.normalized.length
    ? attributesValidation.json
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.sku.update({
      where: { id: skuId },
      data: {
        displayName,
        sizeText: sizeText || "",
        flavorText: flavorText || null,
        isFrozen,
        unitType,
        unitLabel: defaults.unitLabel,
        quantityStep: defaults.quantityStep,
        minQty: defaults.minQty,
        priceCurrent,
        cost: cost ?? null,
        attributesJson,
        isActive,
      },
    });

    await tx.skuTag.deleteMany({ where: { skuId } });
    if (tags.length) {
      await tx.skuTag.createMany({
        data: tags.map((name) => ({
          skuId,
          name,
        })),
      });
    }
  });

  redirect(`/admin/products/${productId}?tab=skus`);
}

export async function duplicateSkuAction(formData: FormData) {
  await requireAdminSession();
  const productId = parseText(formData.get("productId"));
  const skuId = parseText(formData.get("skuId"));
  if (!productId || !skuId) {
    redirect(`/admin/products/${productId}?tab=skus`);
  }

  await prisma.$transaction(async (tx) => {
    const sku = await tx.sku.findUnique({
      where: { id: skuId },
      include: { tags: true },
    });
    if (!sku) {
      redirect(`/admin/products/${productId}?tab=skus`);
    }

    const suffix = new Date().toISOString().slice(11, 19).replace(/:/g, "");
    const displayName = `${sku.displayName} (Copia ${suffix})`;

    const defaults = getSkuDefaults(sku.unitType);
    const newSku = await tx.sku.create({
      data: {
        productId: sku.productId,
        displayName,
        sizeText: sku.sizeText,
        flavorText: sku.flavorText,
        isFrozen: sku.isFrozen,
        unitType: sku.unitType,
        unitLabel: defaults.unitLabel,
        quantityStep: defaults.quantityStep,
        minQty: defaults.minQty,
        priceCurrent: sku.priceCurrent,
        cost: sku.cost,
        attributesJson: sku.attributesJson,
        isActive: sku.isActive,
      },
    });

    if (sku.tags.length) {
      await tx.skuTag.createMany({
        data: sku.tags.map((tag) => ({
          skuId: newSku.id,
          name: tag.name,
        })),
      });
    }
  });

  redirect(`/admin/products/${productId}?tab=skus`);
}

export async function updateProductImagesAction(formData: FormData) {
  await requireAdminSession();
  const id = parseText(formData.get("id"));
  const imageMainUrl = parseText(formData.get("imageMainUrl"));
  const imageExtraUrls = parseLines(formData.get("imageExtraUrls"));

  if (!id) {
    redirect(`/admin/products/${id}?tab=images`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        imageMainUrl: imageMainUrl || null,
      },
    });

    await tx.productImage.deleteMany({ where: { productId: id } });
    if (imageExtraUrls.length) {
      await tx.productImage.createMany({
        data: imageExtraUrls.map((url, index) => ({
          productId: id,
          url,
          sortOrder: index,
        })),
      });
    }
  });

  redirect(`/admin/products/${id}?tab=images`);
}
