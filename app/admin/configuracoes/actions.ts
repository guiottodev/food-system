"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { normalizeAttributeName } from "@/lib/normalization";

type AttributeType = "TEXTO" | "NUMERO" | "LISTA";

const VALID_TYPES = new Set<AttributeType>(["TEXTO", "NUMERO", "LISTA"]);

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseBool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function parseValues(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeValues(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      return { error: "Valores duplicados na lista." } as const;
    }
    seen.add(key);
    normalized.push(value);
  }
  return { values: normalized } as const;
}

function mapAttribute(attribute: {
  id: string;
  name: string;
  type: AttributeType;
  unit: string | null;
  isActive: boolean;
  valores: Array<{ id: string; value: string }>;
  _count: { skuAtributos: number };
}) {
  return {
    id: attribute.id,
    name: attribute.name,
    type: attribute.type,
    unit: attribute.unit,
    isActive: attribute.isActive,
    values: attribute.valores.map((item) => ({ id: item.id, value: item.value })),
    skuUsageCount: attribute._count.skuAtributos,
  };
}

function isUniqueError(err: unknown) {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return err.code === "P2002";
}

export async function createAtributoActionJson(formData: FormData) {
  await requireAdminSession();
  const name = parseText(formData.get("name"));
  const type = parseText(formData.get("type")) as AttributeType;
  const unit = parseText(formData.get("unit"));
  const isActive = parseBool(formData.get("isActive"));
  const valuesInput = parseValues(formData.get("values"));

  if (!name) {
    return { error: "Informe o nome do atributo." };
  }
  if (!VALID_TYPES.has(type)) {
    return { error: "Tipo de atributo invalido." };
  }

  const nameNormalized = normalizeAttributeName(name);

  if (type === "LISTA") {
    if (valuesInput.length === 0) {
      return { error: "Informe os valores da lista." };
    }
    const normalized = normalizeValues(valuesInput);
    if ("error" in normalized) {
      return { error: normalized.error };
    }
  }

  try {
    const attribute = await prisma.$transaction(async (tx) => {
      const created = await tx.atributo.create({
        data: {
          name,
          nameNormalized,
          type,
          unit: unit || null,
          isActive,
        },
        select: { id: true },
      });

      if (type === "LISTA") {
        const normalized = normalizeValues(valuesInput);
        if (!("error" in normalized)) {
          await tx.atributoValor.createMany({
            data: normalized.values.map((value, index) => ({
              atributoId: created.id,
              value,
              sortOrder: index,
            })),
          });
        }
      }

      const full = await tx.atributo.findUnique({
        where: { id: created.id },
        include: {
          valores: { orderBy: { sortOrder: "asc" } },
          _count: { select: { skuAtributos: true } },
        },
      });

      if (!full) {
        throw new Error("attribute-not-found");
      }

      return full;
    });

    return { attribute: mapAttribute(attribute) };
  } catch (err) {
    if (isUniqueError(err)) {
      return { error: "Ja existe um atributo com esse nome." };
    }
    throw err;
  }
}

export async function updateAtributoActionJson(formData: FormData) {
  await requireAdminSession();
  const id = parseText(formData.get("id"));
  const name = parseText(formData.get("name"));
  const type = parseText(formData.get("type")) as AttributeType;
  const unit = parseText(formData.get("unit"));
  const isActive = parseBool(formData.get("isActive"));
  const valuesInput = parseValues(formData.get("values"));

  if (!id || !name) {
    return { error: "Informe o nome do atributo." };
  }
  if (!VALID_TYPES.has(type)) {
    return { error: "Tipo de atributo invalido." };
  }

  const existing = await prisma.atributo.findUnique({
    where: { id },
    include: {
      valores: { orderBy: { sortOrder: "asc" } },
      _count: { select: { skuAtributos: true } },
    },
  });

  if (!existing) {
    return { error: "Atributo nao encontrado." };
  }

  const nameNormalized = normalizeAttributeName(name);
  const duplicate = await prisma.atributo.findFirst({
    where: { nameNormalized, id: { not: id } },
    select: { id: true },
  });
  if (duplicate) {
    return { error: "Ja existe um atributo com esse nome." };
  }

  const inUse = existing._count.skuAtributos > 0;
  if (inUse && type !== existing.type) {
    return { error: "Nao e possivel alterar o tipo quando o atributo ja esta em uso." };
  }

  let valuesChanged = false;
  if (type === "LISTA") {
    if (valuesInput.length === 0) {
      return { error: "Informe os valores da lista." };
    }
    const normalized = normalizeValues(valuesInput);
    if ("error" in normalized) {
      return { error: normalized.error };
    }
    const existingValues = existing.valores.map((val) => val.value.toLowerCase());
    const nextValues = normalized.values.map((val) => val.toLowerCase());
    valuesChanged =
      existingValues.length !== nextValues.length ||
      existingValues.some((value, index) => value !== nextValues[index]);

    if (valuesChanged && inUse && existing.type === "LISTA") {
      return { error: "Nao e possivel alterar os valores da lista quando o atributo ja esta em uso." };
    }
  }

  try {
    const attribute = await prisma.$transaction(async (tx) => {
      await tx.atributo.update({
        where: { id },
        data: {
          name,
          nameNormalized,
          type,
          unit: unit || null,
          isActive,
        },
      });

      if (type === "LISTA") {
        if (!inUse && valuesChanged) {
          const normalized = normalizeValues(valuesInput);
          if (!("error" in normalized)) {
            await tx.atributoValor.deleteMany({ where: { atributoId: id } });
            await tx.atributoValor.createMany({
              data: normalized.values.map((value, index) => ({
                atributoId: id,
                value,
                sortOrder: index,
              })),
            });
          }
        }
      } else {
        await tx.atributoValor.deleteMany({ where: { atributoId: id } });
      }

      const full = await tx.atributo.findUnique({
        where: { id },
        include: {
          valores: { orderBy: { sortOrder: "asc" } },
          _count: { select: { skuAtributos: true } },
        },
      });

      if (!full) {
        throw new Error("attribute-not-found");
      }

      return full;
    });

    return { attribute: mapAttribute(attribute) };
  } catch (err) {
    if (isUniqueError(err)) {
      return { error: "Ja existe um atributo com esse nome." };
    }
    throw err;
  }
}

export async function toggleAtributoAction(id: string, isActive: boolean) {
  await requireAdminSession();
  if (!id) {
    return { error: "Atributo invalido." };
  }

  const attribute = await prisma.atributo.findUnique({
    where: { id },
    include: {
      valores: { orderBy: { sortOrder: "asc" } },
      _count: { select: { skuAtributos: true } },
    },
  });
  if (!attribute) {
    return { error: "Atributo nao encontrado." };
  }

  const updated = await prisma.atributo.update({
    where: { id },
    data: { isActive },
    include: {
      valores: { orderBy: { sortOrder: "asc" } },
      _count: { select: { skuAtributos: true } },
    },
  });

  return { attribute: mapAttribute(updated) };
}

export async function deleteAtributoAction(id: string) {
  await requireAdminSession();
  if (!id) {
    return { error: "Atributo invalido." };
  }

  const usage = await prisma.skuAtributo.count({ where: { atributoId: id } });
  if (usage > 0) {
    return { error: "Nao e possivel excluir um atributo em uso." };
  }

  await prisma.atributo.delete({ where: { id } });
  return { ok: true } as const;
}
