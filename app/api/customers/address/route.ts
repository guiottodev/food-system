import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { getCustomerDeliveryAddress } from "@/lib/domain/customerDelivery";

async function hasValidSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return false;
  return Boolean(verifySessionValue(session.value));
}

export async function GET(request: Request) {
  if (!(await hasValidSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId")?.trim() ?? "";
  if (!customerId) {
    return NextResponse.json({ address: null, source: "none" });
  }

  const result = await getCustomerDeliveryAddress(prisma, customerId);
  return NextResponse.json(result);
}
