"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { normalizeUnitType, normalizeUnitLabel } from "@/lib/unit";

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

function ensureInteger(value: number | null) {
  if (value === null || !Number.isInteger(value)) return null;
  return value;
}

export async function updateProductAction(formData: FormData) {
  await requireAdminSession();
  const id = parseText(formData.get("id"));
  const name = parseText(formData.get("name"));
  const categoryId = parseText(formData.get("categoryId"));
  const descriptionLong = parseText(formData.get("descriptionLong"));
  const leadTime = parseNumber(formData.get("leadTime"));
  const isActive = parseBool(formData.get("isActive"));
  const isPublicHidden = parseBool(formData.get("isPublicHidden"));
  const sobConsulta = parseBool(formData.get("sobConsulta"));
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

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        descriptionLong: descriptionLong || null,
        leadTime,
        isActive,
        isPublicHidden,
        sobConsulta,
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
  const unitType = normalizeUnitType(parseText(formData.get("unitType")));
  const unitLabel = normalizeUnitLabel(parseText(formData.get("unitLabel")));
  const quantityStep = parseNumber(formData.get("quantityStep"));
  const minQty = parseNumber(formData.get("minQty"));
  const priceCurrent = parseNumber(formData.get("priceCurrent"));
  const cost = parseNumber(formData.get("cost"));
  const isFrozen = parseBool(formData.get("isFrozen"));
  const isActive = parseBool(formData.get("isActive"));
  const sobRaw = parseText(formData.get("sobConsultaOverride"));
  const tags = parseTags(formData.get("tags"));

  if (!productId || !displayName || !sizeText || !quantityStep || !priceCurrent) {
    redirect(`/admin/products/${productId}?tab=skus&error=sku_campos&skuMode=new`);
  }

  if (unitType === "KG" && unitLabel !== "kg") {
    redirect(`/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=new`);
  }
  if (unitType === "CENTO" && unitLabel !== "cento") {
    redirect(`/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=new`);
  }
  if (unitType === "UNIDADE" && (unitLabel === "kg" || unitLabel === "cento")) {
    redirect(`/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=new`);
  }

  const normalizedQtyStep =
    unitType === "KG" ? quantityStep : ensureInteger(quantityStep);
  const normalizedMinQty =
    unitType === "KG" ? minQty ?? 1 : ensureInteger(minQty ?? 1);

  if (!normalizedQtyStep || !normalizedMinQty) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_quantidade&skuMode=new`
    );
  }

  const sobConsultaOverride =
    sobRaw === "true" ? true : sobRaw === "false" ? false : null;

  await prisma.$transaction(async (tx) => {
    const sku = await tx.sku.create({
      data: {
        productId,
        displayName,
        sizeText,
        flavorText: flavorText || null,
        isFrozen,
        unitType,
        unitLabel,
        quantityStep: normalizedQtyStep,
        minQty: normalizedMinQty,
        priceCurrent,
        cost: cost ?? null,
        isActive,
        sobConsultaOverride,
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

  redirect(`/admin/products/${productId}?tab=skus`);
}

export async function updateSkuAction(formData: FormData) {
  await requireAdminSession();
  const productId = parseText(formData.get("productId"));
  const skuId = parseText(formData.get("skuId"));
  const displayName = parseText(formData.get("displayName"));
  const sizeText = parseText(formData.get("sizeText"));
  const flavorText = parseText(formData.get("flavorText"));
  const unitType = normalizeUnitType(parseText(formData.get("unitType")));
  const unitLabel = normalizeUnitLabel(parseText(formData.get("unitLabel")));
  const quantityStep = parseNumber(formData.get("quantityStep"));
  const minQty = parseNumber(formData.get("minQty"));
  const priceCurrent = parseNumber(formData.get("priceCurrent"));
  const cost = parseNumber(formData.get("cost"));
  const isFrozen = parseBool(formData.get("isFrozen"));
  const isActive = parseBool(formData.get("isActive"));
  const sobRaw = parseText(formData.get("sobConsultaOverride"));
  const tags = parseTags(formData.get("tags"));

  if (!productId || !skuId || !displayName || !sizeText || !quantityStep || !priceCurrent) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_campos&skuMode=edit&skuId=${skuId}`
    );
  }

  if (unitType === "KG" && unitLabel !== "kg") {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=edit&skuId=${skuId}`
    );
  }
  if (unitType === "CENTO" && unitLabel !== "cento") {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=edit&skuId=${skuId}`
    );
  }
  if (unitType === "UNIDADE" && (unitLabel === "kg" || unitLabel === "cento")) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=edit&skuId=${skuId}`
    );
  }

  const normalizedQtyStep =
    unitType === "KG" ? quantityStep : ensureInteger(quantityStep);
  const normalizedMinQty =
    unitType === "KG" ? minQty ?? 1 : ensureInteger(minQty ?? 1);

  if (!normalizedQtyStep || !normalizedMinQty) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_quantidade&skuMode=edit&skuId=${skuId}`
    );
  }

  const sobConsultaOverride =
    sobRaw === "true" ? true : sobRaw === "false" ? false : null;

  await prisma.$transaction(async (tx) => {
    await tx.sku.update({
      where: { id: skuId },
      data: {
        displayName,
        sizeText,
        flavorText: flavorText || null,
        isFrozen,
        unitType,
        unitLabel,
        quantityStep: normalizedQtyStep,
        minQty: normalizedMinQty,
        priceCurrent,
        cost: cost ?? null,
        isActive,
        sobConsultaOverride,
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

    const newSku = await tx.sku.create({
      data: {
        productId: sku.productId,
        displayName,
        sizeText: sku.sizeText,
        flavorText: sku.flavorText,
        isFrozen: sku.isFrozen,
        unitType: sku.unitType,
        unitLabel: sku.unitLabel,
        quantityStep: sku.quantityStep,
        minQty: sku.minQty,
        priceCurrent: sku.priceCurrent,
        cost: sku.cost,
        isActive: sku.isActive,
        sobConsultaOverride: sku.sobConsultaOverride,
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
