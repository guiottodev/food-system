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

    const validation = validateOrderTransition(order, nextStatus);
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

        // Criar registros de consumo para manter sincronização: stockQuantity = produced - consumed
        for (const [skuId, qty] of totalsBySku.entries()) {
          await tx.productionConsumption.create({
            data: {
              skuId,
              quantity: qty,
              consumedAt: now,
              sourceType: "IMMEDIATE",
              note: `Entrega do pedido ${order.orderNumber}`,
              createdById: actorId,
            },
          });
        }

        // Sincronizar stockQuantity com produced - consumed
        const skuIds = Array.from(totalsBySku.keys());
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
          const nextPending = Number(sku.pendingProductionQuantity ?? 0) + shortage;

          await tx.sku.update({
            where: { id: sku.id },
            data: {
              stockQuantity: newStockQuantity,
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
