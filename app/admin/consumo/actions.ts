"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";
import { validateSkuQuantity } from "@/lib/quantity";
import {
  getDefaultSkuMap,
  getProductCapacitySnapshot,
  normalizeCapacityWindow,
} from "@/lib/domain/production";

type CreateConsumptionPayload = {
  productId?: string;
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
  const productId = typeof payload.productId === "string" ? payload.productId : "";
  if (!productId) {
    redirect("/admin/consumo?error=produto-invalido");
  }

  const rulesMap = await getDefaultSkuMap(prisma, [productId]);
  const rules = rulesMap.get(productId);
  if (!rules) {
    redirect("/admin/consumo?error=produto-invalido");
  }

  const quantityInput = payload.quantity ?? "";
  const quantityResult = validateSkuQuantity(
    {
      unitType: rules.unitType as "KG" | "UNIDADE" | "CENTO",
      minQty: rules.minQty,
      quantityStep: rules.quantityStep,
    },
    quantityInput
  );
  if (!quantityResult.ok) {
    redirect("/admin/consumo?error=quantidade-invalida");
  }

  const normalizedQuantity = quantityResult.normalized;
  const window = normalizeCapacityWindow(payload.window);
  const snapshot = await getProductCapacitySnapshot(prisma, productId, window);
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

  await prisma.productionConsumption.create({
    data: {
      productId,
      quantity: toDecimal(normalizedQuantity),
      consumedAt: new Date(),
      sourceType: payload.sourceType === "MANUAL" ? "MANUAL" : "IMMEDIATE",
      note: payload.note?.trim() || null,
      createdById: actor?.id ?? null,
    },
  });

  redirect("/admin/consumo?created=1");
}
