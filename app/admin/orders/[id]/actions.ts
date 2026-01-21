"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySessionValue } from "@/lib/session";
import {
  validateCancelReason,
  validateStatusTransition,
} from "@/lib/domain/order";
import { transitionOrderStatus } from "@/lib/domain/transitionOrderStatus";
import { OrderStatus } from "@prisma/client";

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
  const markPaid = String(formData.get("markPaid") ?? "") === "1";
  if (!orderId || !nextStatus) {
    redirect(`/admin/orders/${orderId}`);
  }

  const actorId = await getActorId();

  const result = await transitionOrderStatus(
    prisma,
    orderId,
    nextStatus,
    actorId,
    { markPaid }
  );
  if (!result.ok) {
    const errorParam =
      result.error === "not_ready"
        ? "ready"
        : result.error === "strong_pending"
        ? "pendencia"
        : result.error === "payment_required"
        ? "pagamento"
        : "transicao";
    redirect(`/admin/orders/${orderId}?error=${errorParam}`);
  }

  redirect(`/admin/orders/${orderId}`);
}

export async function cancelOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("cancellationReason") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders/${orderId}`);
  }

  const reasonValidation = validateCancelReason(reason);
  if (!reasonValidation.ok) {
    redirect(`/admin/orders/${orderId}?error=motivo`);
  }

  const actorId = await getActorId();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      redirect("/admin/orders");
    }

    const validation = validateStatusTransition(order.status, "CANCELADO");
    if (!validation.ok) {
      redirect(`/admin/orders/${orderId}?error=transicao`);
    }

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
        field: "status",
        beforeValue: order.status,
        afterValue: "CANCELADO",
        reason: reason || null,
      },
    });
  });

  redirect(`/admin/orders/${orderId}`);
}

export async function confirmOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("confirmReason") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders/${orderId}`);
  }

  const actorId = await getActorId();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      redirect("/admin/orders");
    }

    if (order.status !== "RASCUNHO") {
      redirect(`/admin/orders/${orderId}?error=confirmacao`);
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMADO",
        confirmedAt: new Date(),
        needsReconfirmation: false,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "orders",
        entityId: orderId,
        action: "confirm",
        field: "status",
        beforeValue: order.status,
        afterValue: "CONFIRMADO",
        reason: reason || null,
      },
    });
  });

  redirect(`/admin/orders/${orderId}?confirmed=1`);
}

export async function reconfirmOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reconfirmReason") ?? "").trim();
  if (!orderId) {
    redirect(`/admin/orders/${orderId}`);
  }

  const actorId = await getActorId();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      redirect("/admin/orders");
    }

    if (order.status === "ENTREGUE" || order.status === "CANCELADO") {
      redirect(`/admin/orders/${orderId}?error=confirmacao`);
    }

    if (!order.needsReconfirmation) {
      redirect(`/admin/orders/${orderId}?error=reconfirmacao`);
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        confirmedAt: new Date(),
        needsReconfirmation: false,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "orders",
        entityId: orderId,
        action: "reconfirm",
        field: "needsReconfirmation",
        beforeValue: "true",
        afterValue: "false",
        reason: reason || null,
      },
    });
  });

  redirect(`/admin/orders/${orderId}?reconfirmed=1`);
}
