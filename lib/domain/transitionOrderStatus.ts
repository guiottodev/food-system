import { PrismaClient, OrderStatus } from "@prisma/client";
import { validateStatusTransition } from "./order";

export type TransitionResult =
  | { ok: true; appliedStock: boolean }
  | { ok: false; error: string };

export async function transitionOrderStatus(
  prisma: PrismaClient,
  orderId: string,
  nextStatus: OrderStatus,
  actorId: string | null
): Promise<TransitionResult> {
  const STOCK_ENABLED = false;

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

    const validation = validateStatusTransition(order.status, nextStatus);
    if (!validation.ok) {
      return { ok: false, error: "invalid_transition" };
    }

    let appliedStock = false;

    if (nextStatus === "ENTREGUE") {
      if (!STOCK_ENABLED) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: nextStatus },
        });
      } else {
      const now = new Date();
      const marked = await tx.order.updateMany({
        where: {
          id: orderId,
          stockDecrementedAt: null,
        },
        data: {
          status: nextStatus,
          stockDecrementedAt: now,
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
          data: { status: nextStatus },
        });
      }
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
        changes: `${order.status} -> ${nextStatus}`,
      },
    });

    return { ok: true, appliedStock };
  });
}
