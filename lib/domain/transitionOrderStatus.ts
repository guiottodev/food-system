import { PrismaClient, OrderStatus } from "@prisma/client";
import { validateOrderTransition } from "./order";

export type TransitionResult =
  | { ok: true; appliedStock: boolean }
  | {
      ok: false;
      error:
        | "missing_order"
        | "order_not_found"
        | "invalid_transition"
        | "final_status"
        | "not_ready"
        | "strong_pending"
        | "payment_required";
    };

type TransitionOptions = {
  markPaid?: boolean;
};

export async function transitionOrderStatus(
  prisma: PrismaClient,
  orderId: string,
  nextStatus: OrderStatus,
  actorId: string | null,
  options: TransitionOptions = {}
): Promise<TransitionResult> {
  if (!orderId) {
    return { ok: false, error: "missing_order" };
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            skuId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      return { ok: false, error: "order_not_found" };
    }

    const validation = validateOrderTransition(order, nextStatus, {
      willMarkPaid: options.markPaid,
    });
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }

    let appliedStock = false;
    const shouldMarkPaid = Boolean(options.markPaid) && !order.paidAt;
    const paidAt = shouldMarkPaid ? new Date() : order.paidAt;

    if (nextStatus === "CONFIRMADO") {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          confirmedAt: new Date(),
          needsReconfirmation: false,
        },
      });
    } else if (nextStatus === "ENTREGUE") {
      const now = new Date();
      const marked = await tx.order.updateMany({
        where: {
          id: orderId,
          stockDecrementedAt: null,
        },
        data: {
          status: nextStatus,
          stockDecrementedAt: now,
          paidAt: shouldMarkPaid ? paidAt : order.paidAt,
        },
      });

      if (marked.count === 1) {
        appliedStock = true;
        for (const item of order.items) {
          if (!item.skuId) continue;
          await tx.sku.update({
            where: { id: item.skuId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      } else if (order.status !== "ENTREGUE") {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: nextStatus,
            paidAt: shouldMarkPaid ? paidAt : order.paidAt,
          },
        });
      }
    } else {
      await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        entityType: "orders",
        entityId: orderId,
        action: "status_change",
        field: "status",
        beforeValue: order.status,
        afterValue: nextStatus,
      },
    });

    return { ok: true, appliedStock };
  });
}
