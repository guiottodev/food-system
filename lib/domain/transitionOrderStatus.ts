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
        | "strong_pending";
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
        const totalsBySku = new Map<string, number>();
        for (const item of order.items) {
          if (!item.skuId) continue;
          totalsBySku.set(
            item.skuId,
            (totalsBySku.get(item.skuId) ?? 0) + Number(item.quantity)
          );
        }

        const skuBalances = await tx.sku.findMany({
          where: { id: { in: Array.from(totalsBySku.keys()) } },
          select: {
            id: true,
            stockQuantity: true,
            pendingProductionQuantity: true,
          },
        });
        const balanceMap = new Map(skuBalances.map((sku) => [sku.id, sku]));

        for (const [skuId, qty] of totalsBySku.entries()) {
          const current = balanceMap.get(skuId);
          if (!current) continue;
          const stock = Number(current.stockQuantity ?? 0);
          const pending = Number(current.pendingProductionQuantity ?? 0);
          const shortage = Math.max(qty - stock, 0);
          const nextStock = Math.max(stock - qty, 0);
          const nextPending = pending + shortage;
          await tx.sku.update({
            where: { id: skuId },
            data: {
              stockQuantity: nextStock,
              pendingProductionQuantity: nextPending,
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
