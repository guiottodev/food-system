"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import { OrderStatus } from "@prisma/client";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  NOVO: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["EM_PRODUCAO", "PRONTO", "CANCELADO"],
  EM_PRODUCAO: ["PRONTO", "CANCELADO"],
  PRONTO: ["EM_ROTA", "ENTREGUE", "CANCELADO"],
  EM_ROTA: ["ENTREGUE", "CANCELADO"],
  ENTREGUE: [],
  CANCELADO: [],
};

async function getActorId() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }
  const sessionData = verifySessionValue(session.value);
  if (!sessionData) {
    return null;
  }
  const actor = await prisma.user.findUnique({
    where: { username: sessionData.username },
  });
  return actor?.id ?? null;
}

export async function updateStatusAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as OrderStatus;
  if (!orderId || !nextStatus) {
    redirect(`/admin/orders/${orderId}`);
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    redirect("/admin/orders");
  }

  const allowed = transitions[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    redirect(`/admin/orders/${orderId}?error=transicao`);
  }

  const actorId = await getActorId();

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "orders",
        entityId: orderId,
        action: "status_change",
        changes: `${order.status} -> ${nextStatus}`,
      },
    });
  });

  redirect(`/admin/orders/${orderId}`);
}

export async function cancelOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("cancellationReason") ?? "").trim();
  if (!orderId || !reason) {
    redirect(`/admin/orders/${orderId}?error=motivo`);
  }

  const actorId = await getActorId();

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELADO", cancellationReason: reason },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "orders",
        entityId: orderId,
        action: "cancel",
        changes: reason,
      },
    });
  });

  redirect(`/admin/orders/${orderId}`);
}
