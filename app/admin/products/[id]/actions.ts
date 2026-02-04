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
import { normalizePriceValue } from "@/lib/price";
import {
  normalizeProductName,
  normalizeSkuDisplayName,
  normalizeSkuReference,
} from "@/lib/normalization";
import { Prisma } from "@prisma/client";

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

function parseReference(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return { referencia: null, referenciaNormalized: null };
  }
  if (raw.length > 50) {
    return { error: "referencia_tamanho" as const };
  }
  return {
    referencia: raw,
    referenciaNormalized: normalizeSkuReference(raw),
  };
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

function isReferenceUniqueError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = err.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("referenciaNormalized");
  }
  if (typeof target === "string") {
    return target.includes("referenciaNormalized");
  }
  return false;
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

type CatalogAttributeInput = {
  atributoId: string;
  atributoValorId?: string | null;
  valueText?: string | null;
};

type NormalizedCatalogAttribute = {
  atributoId: string;
  atributoValorId: string | null;
  valueText: string | null;
};

function parseAttributesCatalog(
  value: FormDataEntryValue | null
): CatalogAttributeInput[] | null {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((item) => ({
      atributoId: String(item?.atributoId ?? ""),
      atributoValorId:
        item?.atributoValorId != null ? String(item.atributoValorId) : null,
      valueText: item?.valueText != null ? String(item.valueText) : null,
    }));
  } catch {
    return null;
  }
}

async function validateCatalogAttributes(
  rows: CatalogAttributeInput[],
  skuId?: string
): Promise<
  | { ok: true; normalized: NormalizedCatalogAttribute[] }
  | { ok: false; error: string }
> {
  const filtered = rows.filter((row) => {
    const hasValue =
      String(row.atributoId ?? "").trim() ||
      String(row.atributoValorId ?? "").trim() ||
      String(row.valueText ?? "").trim();
    return Boolean(hasValue);
  });

  if (filtered.length === 0) {
    return { ok: true, normalized: [] };
  }

  if (filtered.length > 15) {
    return { ok: false, error: "Limite de 15 atributos por SKU." };
  }

  const seen = new Set<string>();
  for (const row of filtered) {
    const attrId = String(row.atributoId ?? "").trim();
    if (!attrId) {
      return { ok: false, error: "Selecione um atributo valido." };
    }
    if (seen.has(attrId)) {
      return { ok: false, error: "Cada atributo deve ser unico." };
    }
    seen.add(attrId);
  }

  const atributoIds = Array.from(seen);
  const atributos = await prisma.atributo.findMany({
    where: { id: { in: atributoIds } },
    include: { valores: { orderBy: { sortOrder: "asc" } } },
  });
  const atributoMap = new Map(atributos.map((attr) => [attr.id, attr]));
  let allowedInactive = new Set<string>();
  if (skuId) {
    const existing = await prisma.skuAtributo.findMany({
      where: { skuId, atributoId: { in: atributoIds } },
      select: { atributoId: true },
    });
    allowedInactive = new Set(existing.map((item) => item.atributoId));
  }

  const normalized: NormalizedCatalogAttribute[] = [];

  for (const row of filtered) {
    const atributoId = String(row.atributoId ?? "").trim();
    const atributo = atributoMap.get(atributoId);
    if (!atributo) {
      return { ok: false, error: "Atributo invalido." };
    }
    if (!atributo.isActive && !allowedInactive.has(atributoId)) {
      return { ok: false, error: "Atributo inativo." };
    }

    if (atributo.type === "LISTA") {
      const atributoValorId = String(row.atributoValorId ?? "").trim();
      if (!atributoValorId) {
        return { ok: false, error: "Selecione um valor para o atributo." };
      }
      const exists = atributo.valores.some((val) => val.id === atributoValorId);
      if (!exists) {
        return { ok: false, error: "Valor de atributo invalido." };
      }
      normalized.push({
        atributoId,
        atributoValorId,
        valueText: null,
      });
      continue;
    }

    let valueText = String(row.valueText ?? "").trim();
    if (!valueText) {
      return { ok: false, error: "Preencha o valor do atributo." };
    }
    if (atributo.type === "NUMERO") {
      const normalizedNumber = Number(valueText.replace(",", "."));
      if (!Number.isFinite(normalizedNumber)) {
        return { ok: false, error: "Valor numerico invalido." };
      }
      valueText = String(normalizedNumber);
    }

    normalized.push({
      atributoId,
      atributoValorId: null,
      valueText,
    });
  }

  return { ok: true, normalized };
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
        nameNormalized: normalizeProductName(name),
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
  const referencia = parseReference(formData.get("referencia"));
  const sizeText = parseText(formData.get("sizeText"));
  const flavorText = parseText(formData.get("flavorText"));
  const unitTypeRaw = parseText(formData.get("unitType"));
  const priceCurrent = parseNumber(formData.get("priceCurrent"));
  const cost = parseNumber(formData.get("cost"));
  const isFrozen = parseBool(formData.get("isFrozen"));
  const isActive = parseBool(formData.get("isActive"));
  const tags = parseTags(formData.get("tags"));
  const attributesMode = parseText(formData.get("attributesMode"));
  const attributesInput = parseAttributesJson(formData.get("attributesJson"));
  const catalogAttributesInput = parseAttributesCatalog(
    formData.get("attributesCatalog")
  );

  if (!productId || !displayName || !unitTypeRaw || !priceCurrent) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_campos&skuMode=new`
    );
  }
  if (referencia && "error" in referencia) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_referencia&skuMode=new`
    );
  }

  let unitType: "UNIDADE" | "KG";
  try {
    unitType = normalizeUnitType(unitTypeRaw);
  } catch {
    redirect(`/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=new`);
    return;
  }

  const defaults = getSkuDefaults(unitType);
  const normalizedPrice = normalizePriceValue(priceCurrent ?? 0, unitType);
  const normalizedCost =
    cost !== null ? normalizePriceValue(cost, unitType) : null;
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

  if (catalogAttributesInput === null) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=new`
    );
  }
  const useLegacyAttributes = attributesMode === "legacy";
  let attributesJson: string | null = null;
  let catalogAttributes: NormalizedCatalogAttribute[] = [];

  if (useLegacyAttributes) {
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
    attributesJson = attributesValidation.normalized.length
      ? attributesValidation.json
      : null;
  } else {
    const catalogValidation = await validateCatalogAttributes(
      catalogAttributesInput ?? []
    );
    if (!catalogValidation.ok) {
      redirect(
        `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=new`
      );
    }
    catalogAttributes = catalogValidation.normalized;
  }

  if (referencia?.referenciaNormalized) {
    const existing = await prisma.sku.findFirst({
      where: { referenciaNormalized: referencia.referenciaNormalized },
      select: { id: true },
    });
    if (existing) {
      redirect(
        `/admin/products/${productId}?tab=skus&error=referencia_duplicada&skuMode=new`
      );
    }
  }

  const activeBefore = await prisma.sku.count({
    where: { productId, isActive: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      const sku = await tx.sku.create({
        data: {
          productId,
          displayName,
          displayNameNormalized: normalizeSkuDisplayName(displayName),
          referencia: referencia?.referencia ?? null,
          referenciaNormalized: referencia?.referenciaNormalized ?? null,
          sizeText: sizeText || "",
          flavorText: flavorText || null,
          isFrozen,
          unitType,
          unitLabel: defaults.unitLabel,
          quantityStep: defaults.quantityStep,
          minQty: defaults.minQty,
          priceCurrent: normalizedPrice,
          cost: normalizedCost,
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

      if (!useLegacyAttributes && catalogAttributes.length) {
        await tx.skuAtributo.createMany({
          data: catalogAttributes.map((attr) => ({
            skuId: sku.id,
            atributoId: attr.atributoId,
            atributoValorId: attr.atributoValorId,
            valueText: attr.valueText,
          })),
        });
      }
    });
  } catch (err) {
    if (isReferenceUniqueError(err)) {
      redirect(
        `/admin/products/${productId}?tab=skus&error=referencia_duplicada&skuMode=new`
      );
    }
    throw err;
  }

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
  const referencia = parseReference(formData.get("referencia"));
  const sizeText = parseText(formData.get("sizeText"));
  const flavorText = parseText(formData.get("flavorText"));
  const unitTypeRaw = parseText(formData.get("unitType"));
  const priceCurrent = parseNumber(formData.get("priceCurrent"));
  const cost = parseNumber(formData.get("cost"));
  const isFrozen = parseBool(formData.get("isFrozen"));
  const isActive = parseBool(formData.get("isActive"));
  const tags = parseTags(formData.get("tags"));
  const attributesMode = parseText(formData.get("attributesMode"));
  const attributesInput = parseAttributesJson(formData.get("attributesJson"));
  const catalogAttributesInput = parseAttributesCatalog(
    formData.get("attributesCatalog")
  );

  if (!productId || !skuId || !displayName || !unitTypeRaw || !priceCurrent) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_campos&skuMode=edit&skuId=${skuId}`
    );
  }
  if (referencia && "error" in referencia) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_referencia&skuMode=edit&skuId=${skuId}`
    );
  }

  let unitType: "UNIDADE" | "KG";
  try {
    unitType = normalizeUnitType(unitTypeRaw);
  } catch {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_unit&skuMode=edit&skuId=${skuId}`
    );
    return;
  }

  const defaults = getSkuDefaults(unitType);
  const normalizedPrice = normalizePriceValue(priceCurrent ?? 0, unitType);
  const normalizedCost =
    cost !== null ? normalizePriceValue(cost, unitType) : null;
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

  if (catalogAttributesInput === null) {
    redirect(
      `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=edit&skuId=${skuId}`
    );
  }
  const useLegacyAttributes = attributesMode === "legacy";
  let attributesJson: string | null = null;
  let catalogAttributes: NormalizedCatalogAttribute[] = [];

  if (useLegacyAttributes) {
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
    attributesJson = attributesValidation.normalized.length
      ? attributesValidation.json
      : null;
  } else {
    const catalogValidation = await validateCatalogAttributes(
      catalogAttributesInput ?? [],
      skuId
    );
    if (!catalogValidation.ok) {
      redirect(
        `/admin/products/${productId}?tab=skus&error=sku_atributos&skuMode=edit&skuId=${skuId}`
      );
    }
    catalogAttributes = catalogValidation.normalized;
  }

  if (referencia?.referenciaNormalized) {
    const existing = await prisma.sku.findFirst({
      where: {
        referenciaNormalized: referencia.referenciaNormalized,
        id: { not: skuId },
      },
      select: { id: true },
    });
    if (existing) {
      redirect(
        `/admin/products/${productId}?tab=skus&error=referencia_duplicada&skuMode=edit&skuId=${skuId}`
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sku.update({
        where: { id: skuId },
        data: {
          displayName,
          displayNameNormalized: normalizeSkuDisplayName(displayName),
          referencia: referencia?.referencia ?? null,
          referenciaNormalized: referencia?.referenciaNormalized ?? null,
          sizeText: sizeText || "",
          flavorText: flavorText || null,
          isFrozen,
          unitType,
          unitLabel: defaults.unitLabel,
          quantityStep: defaults.quantityStep,
          minQty: defaults.minQty,
          priceCurrent: normalizedPrice,
          cost: normalizedCost,
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

      if (!useLegacyAttributes) {
        await tx.skuAtributo.deleteMany({ where: { skuId } });
        if (catalogAttributes.length) {
          await tx.skuAtributo.createMany({
            data: catalogAttributes.map((attr) => ({
              skuId,
              atributoId: attr.atributoId,
              atributoValorId: attr.atributoValorId,
              valueText: attr.valueText,
            })),
          });
        }
      }
    });
  } catch (err) {
    if (isReferenceUniqueError(err)) {
      redirect(
        `/admin/products/${productId}?tab=skus&error=referencia_duplicada&skuMode=edit&skuId=${skuId}`
      );
    }
    throw err;
  }

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
      include: { tags: true, skuAtributos: true },
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
        displayNameNormalized: normalizeSkuDisplayName(displayName),
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
        referencia: null,
        referenciaNormalized: null,
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

    if (sku.skuAtributos.length) {
      await tx.skuAtributo.createMany({
        data: sku.skuAtributos.map((attr) => ({
          skuId: newSku.id,
          atributoId: attr.atributoId,
          atributoValorId: attr.atributoValorId,
          valueText: attr.valueText,
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
