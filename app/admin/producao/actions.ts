"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { validateSkuQuantity } from "@/lib/quantity";
import { getDefaultSkuMap } from "@/lib/domain/production";

type ProductionItemPayload = {
  productId?: string;
  quantity?: number | string;
  note?: string;
};

type CreateProductionPayload = {
  producedAt?: string;
  note?: string;
  items?: ProductionItemPayload[];
};

function parsePayload(formData: FormData): CreateProductionPayload {
  const raw = String(formData.get("payload") ?? "{}");
  return JSON.parse(raw) as CreateProductionPayload;
}

function parseProducedAt(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    redirect("/admin/producao?error=data-invalida");
  }
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    redirect("/admin/producao?error=data-invalida");
  }
  return parsed;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

export async function createProductionSessionAction(formData: FormData) {
  const payload = parsePayload(formData);
  const items = Array.isArray(payload.items) ? payload.items : [];

  if (items.length === 0) {
    redirect("/admin/producao?error=sem-itens");
  }

  const producedAt = parseProducedAt(payload.producedAt);
  const productIds = items
    .map((item) => (typeof item.productId === "string" ? item.productId : ""))
    .filter(Boolean);

  if (productIds.length === 0) {
    redirect("/admin/producao?error=produto-invalido");
  }

  const rulesMap = await getDefaultSkuMap(prisma, productIds);
  const normalizedItems = items.map((item) => {
    const productId = typeof item.productId === "string" ? item.productId : "";
    if (!productId) {
      redirect("/admin/producao?error=produto-invalido");
    }
    const rules = rulesMap.get(productId);
    if (!rules) {
      redirect("/admin/producao?error=produto-invalido");
    }

    const quantityInput = item.quantity ?? "";
    const quantityResult = validateSkuQuantity(
      {
        unitType: rules.unitType as "KG" | "UNIDADE" | "CENTO",
        minQty: rules.minQty,
        quantityStep: rules.quantityStep,
      },
      quantityInput
    );

    if (!quantityResult.ok) {
      redirect("/admin/producao?error=quantidade-invalida");
    }

    return {
      productId,
      quantity: quantityResult.normalized,
      note: item.note?.trim() || null,
    };
  });

  const sessionData = await requireAdminSession();
  const actor = await prisma.user.findUnique({
    where: { username: sessionData.username },
    select: { id: true },
  });

  await prisma.productionSession.create({
    data: {
      producedAt,
      note: payload.note?.trim() || null,
      createdById: actor?.id ?? null,
      items: {
        create: normalizedItems.map((item) => ({
          productId: item.productId,
          quantity: toDecimal(item.quantity),
          note: item.note,
        })),
      },
    },
  });

  redirect("/admin/producao?created=1");
}
