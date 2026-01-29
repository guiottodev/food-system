/**
 * Script para sincronizar stockQuantity com produced - consumed
 * 
 * Executa: npx tsx scripts/sync-stock-quantity.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function syncStockQuantity() {
  console.log("Iniciando sincronização de stockQuantity...");

  // Buscar todos os SKUs ativos
  const skus = await prisma.sku.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true },
  });

  console.log(`Encontrados ${skus.length} SKUs para sincronizar`);

  let updated = 0;
  let errors = 0;

  for (const sku of skus) {
    try {
      // Calcular produced - consumed
      const [producedItems, consumedItems] = await Promise.all([
        prisma.productionSessionItem.findMany({
          where: { skuId: sku.id },
          select: { quantity: true },
        }),
        prisma.productionConsumption.findMany({
          where: { skuId: sku.id },
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

      // Buscar SKU completo para atualizar
      const currentSku = await prisma.sku.findUnique({
        where: { id: sku.id },
        select: { stockQuantity: true, pendingProductionQuantity: true },
      });

      if (!currentSku) {
        console.error(`SKU ${sku.id} não encontrado`);
        errors++;
        continue;
      }

      const currentStock = Number(currentSku.stockQuantity ?? 0);
      const shortage = Math.max(0, newStockQuantity - currentStock);
      const nextPending = Number(currentSku.pendingProductionQuantity ?? 0) + shortage;

      // Atualizar apenas se diferente
      if (currentStock !== newStockQuantity) {
        await prisma.sku.update({
          where: { id: sku.id },
          data: {
            stockQuantity: newStockQuantity,
            pendingProductionQuantity: nextPending,
          },
        });

        console.log(
          `SKU ${sku.displayName}: ${currentStock} → ${newStockQuantity} (produzido: ${produced}, consumido: ${consumed})`
        );
        updated++;
      }
    } catch (error) {
      console.error(`Erro ao sincronizar SKU ${sku.id}:`, error);
      errors++;
    }
  }

  console.log(`\nSincronização concluída:`);
  console.log(`- Atualizados: ${updated}`);
  console.log(`- Sem alterações: ${skus.length - updated - errors}`);
  console.log(`- Erros: ${errors}`);
}

syncStockQuantity()
  .catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
