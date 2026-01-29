"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { validateSkuQuantity } from "@/lib/quantity";
import { getProductCapacitySnapshot, normalizeCapacityWindow } from "@/lib/domain/production";

type CreateConsumptionPayload = {
  skuId?: string;
  quantity?: number | string;
  sourceType?: "IMMEDIATE" | "MANUAL";
  note?: string;
  window?: string;
  confirmWarnings?: boolean;
};

function parsePayload(formData: FormData): CreateConsumptionPayload {
  const raw = String(formData.get("payload") ?? "{}");
  return JSON.parse(raw) as CreateConsumptionPayload;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function buildWarningRedirect(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  redirect(`/admin/consumo?${search.toString()}`);
}

export async function createConsumptionAction(formData: FormData) {
  const payload = parsePayload(formData);
  const skuId = typeof payload.skuId === "string" ? payload.skuId : "";
  if (!skuId) {
    redirect("/admin/consumo?error=sku-invalido");
  }

  const sku = await prisma.sku.findUnique({
    where: { id: skuId },
    select: {
      id: true,
      productId: true,
      unitType: true,
      minQty: true,
      quantityStep: true,
      stockQuantity: true,
      pendingProductionQuantity: true,
    },
  });
  if (!sku) {
    redirect("/admin/consumo?error=sku-invalido");
  }

  const quantityInput = payload.quantity ?? "";
  const quantityResult = validateSkuQuantity(
    {
      unitType: sku.unitType as "KG" | "UNIDADE",
      minQty: sku.minQty,
      quantityStep: sku.quantityStep,
    },
    quantityInput
  );
  if (!quantityResult.ok) {
    redirect("/admin/consumo?error=quantidade-invalida");
  }

  const normalizedQuantity = quantityResult.normalized;
  const window = normalizeCapacityWindow(payload.window);
  const snapshot = await getProductCapacitySnapshot(prisma, sku.productId, window);
  const projectedAvailable = snapshot.available - normalizedQuantity;
  const gapAfter = Math.max(snapshot.demand - projectedAvailable, 0);

  const warnImpact = projectedAvailable < snapshot.demand;
  const warnNegative = snapshot.available < normalizedQuantity;

  if ((warnImpact || warnNegative) && !payload.confirmWarnings) {
    const params: Record<string, string> = {
      warnImpact: warnImpact ? "1" : "0",
      warnNegative: warnNegative ? "1" : "0",
      demand: String(snapshot.demand),
      gap: String(gapAfter),
      windowEnd: snapshot.windowEnd.toISOString().slice(0, 10),
      quantity: String(normalizedQuantity),
      window,
    };
    buildWarningRedirect(params);
  }

  const sessionData = await requireAdminSession();
  const actor = await prisma.user.findUnique({
    where: { username: sessionData.username },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.productionConsumption.create({
      data: {
        skuId,
        quantity: toDecimal(normalizedQuantity),
        consumedAt: new Date(),
        sourceType: payload.sourceType === "MANUAL" ? "MANUAL" : "IMMEDIATE",
        note: payload.note?.trim() || null,
        createdById: actor?.id ?? null,
      },
    });

    // Sincronizar stockQuantity com produced - consumed após consumo
    const [producedItems, consumedItems] = await Promise.all([
      tx.productionSessionItem.findMany({
        where: { sku: { id: skuId } },
        select: { quantity: true },
      }),
      tx.productionConsumption.findMany({
        where: { sku: { id: skuId } },
        select: { quantity: true },
      }),
    ]);

    const produced = producedItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );
    const consumed = consumedItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0
    );
    const newStockQuantity = Math.max(0, produced - consumed);
    const currentStock = Number(sku.stockQuantity ?? 0);
    const shortage = Math.max(0, newStockQuantity - currentStock);
    const currentPending = Number(sku.pendingProductionQuantity ?? 0);
    const nextPending = currentPending + shortage;

    await tx.sku.update({
      where: { id: skuId },
      data: {
        stockQuantity: toDecimal(newStockQuantity),
        pendingProductionQuantity: toDecimal(nextPending),
      },
    });
  });

  redirect("/admin/consumo?created=1");
}
