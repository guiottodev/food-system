import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { computeUnavailableItemsForDraft } from "@/lib/domain/production";

type AvailabilityItem = {
  skuId?: string;
  quantity?: number | string;
};

async function hasValidSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return false;
  return Boolean(verifySessionValue(session.value));
}

export async function POST(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { items?: AvailabilityItem[] } | null = null;
  try {
    payload = (await request.json()) as { items?: AvailabilityItem[] };
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const normalizedItems = items
    .filter((item) => typeof item?.skuId === "string")
    .map((item) => ({
      skuId: item.skuId as string,
      quantity: item.quantity,
    }));

  const result = await computeUnavailableItemsForDraft(prisma, normalizedItems);

  return NextResponse.json({
    hasUnavailableItems: result.hasUnavailableItems,
    unavailableItems: result.unavailableItems,
  });
}
