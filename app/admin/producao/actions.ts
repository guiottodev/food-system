"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { validateSkuQuantity } from "@/lib/quantity";

type ProductionItemPayload = {
  skuId?: string;
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
  const skuIds = items
    .map((item) => (typeof item.skuId === "string" ? item.skuId : ""))
    .filter(Boolean);

  if (skuIds.length === 0) {
    redirect("/admin/producao?error=sku-invalido");
  }

  const skuRows = await prisma.sku.findMany({
    where: { id: { in: skuIds } },
    select: {
      id: true,
      unitType: true,
      minQty: true,
      quantityStep: true,
    },
  });
  const skuMap = new Map(skuRows.map((sku) => [sku.id, sku]));

  const normalizedItems = items.map((item) => {
    const skuId = typeof item.skuId === "string" ? item.skuId : "";
    if (!skuId) {
      redirect("/admin/producao?error=sku-invalido");
    }
    const sku = skuMap.get(skuId);
    if (!sku) {
      redirect("/admin/producao?error=sku-invalido");
    }

    const quantityInput = item.quantity ?? "";
    const quantityResult = validateSkuQuantity(
      {
        unitType: sku.unitType as "KG" | "UNIDADE",
        minQty: sku.minQty,
        quantityStep: sku.quantityStep,
      },
      quantityInput
    );

    if (!quantityResult.ok) {
      redirect("/admin/producao?error=quantidade-invalida");
    }

    return {
      skuId,
      quantity: quantityResult.normalized,
      note: item.note?.trim() || null,
    };
  });

  const sessionData = await requireAdminSession();
  const actor = await prisma.user.findUnique({
    where: { username: sessionData.username },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.productionSession.create({
      data: {
        producedAt,
        note: payload.note?.trim() || null,
        createdById: actor?.id ?? null,
        items: {
          create: normalizedItems.map((item) => ({
            skuId: item.skuId,
            quantity: toDecimal(item.quantity),
            note: item.note,
          })),
        },
      },
    });

    const totalsBySku = new Map<string, number>();
    for (const item of normalizedItems) {
      totalsBySku.set(item.skuId, (totalsBySku.get(item.skuId) ?? 0) + item.quantity);
    }

    const skuIds = Array.from(totalsBySku.keys());
    
    // Sincronizar stockQuantity com produced - consumed após produção
    const [producedItems, consumedItems] = await Promise.all([
      tx.productionSessionItem.findMany({
        where: { sku: { id: { in: skuIds } } },
        select: { quantity: true, sku: { select: { id: true } } },
      }),
      tx.productionConsumption.findMany({
        where: { sku: { id: { in: skuIds } } },
        select: { quantity: true, sku: { select: { id: true } } },
      }),
    ]);

    const producedBySku = new Map<string, number>();
    const consumedBySku = new Map<string, number>();
    
    for (const item of producedItems) {
      const skuId = item.sku?.id;
      if (!skuId) continue;
      producedBySku.set(skuId, (producedBySku.get(skuId) ?? 0) + Number(item.quantity));
    }
    
    for (const item of consumedItems) {
      const skuId = item.sku?.id;
      if (!skuId) continue;
      consumedBySku.set(skuId, (consumedBySku.get(skuId) ?? 0) + Number(item.quantity));
    }

    const skuBalances = await tx.sku.findMany({
      where: { id: { in: skuIds } },
      select: {
        id: true,
        stockQuantity: true,
        pendingProductionQuantity: true,
      },
    });

    for (const sku of skuBalances) {
      const produced = producedBySku.get(sku.id) ?? 0;
      const consumed = consumedBySku.get(sku.id) ?? 0;
      const newStockQuantity = Math.max(0, produced - consumed);
      const currentStock = Number(sku.stockQuantity ?? 0);
      const shortage = Math.max(0, newStockQuantity - currentStock);
      const currentPending = Number(sku.pendingProductionQuantity ?? 0);
      // Reduzir pending se houver produção suficiente
      const nextPending = Math.max(0, currentPending - shortage);

      await tx.sku.update({
        where: { id: sku.id },
        data: {
          stockQuantity: toDecimal(newStockQuantity),
          pendingProductionQuantity: toDecimal(nextPending),
        },
      });
    }
  });

  redirect("/admin/producao?created=1");
}
