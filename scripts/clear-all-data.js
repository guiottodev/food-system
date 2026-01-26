/**
 * Script para limpar TODOS os dados do banco de dados
 * ATENÇÃO: Esta operação é IRREVERSÍVEL!
 * 
 * Uso: node scripts/clear-all-data.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearAllData() {
  console.log("🚨 INICIANDO LIMPEZA COMPLETA DO BANCO DE DADOS...");
  console.log("⚠️  ATENÇÃO: Esta operação é IRREVERSÍVEL!\n");

  try {
    // Ordem de deleção respeitando foreign keys
    
    console.log("1. Deletando OrderItems...");
    await prisma.orderItem.deleteMany({});
    console.log("   ✅ OrderItems deletados");

    console.log("2. Deletando Orders...");
    await prisma.order.deleteMany({});
    console.log("   ✅ Orders deletados");

    console.log("3. Deletando CustomerAddresses...");
    await prisma.customerAddress.deleteMany({});
    console.log("   ✅ CustomerAddresses deletados");

    console.log("4. Deletando Customers...");
    await prisma.customer.deleteMany({});
    console.log("   ✅ Customers deletados");

    console.log("5. Deletando ProductionSessionItems...");
    await prisma.productionSessionItem.deleteMany({});
    console.log("   ✅ ProductionSessionItems deletados");

    console.log("6. Deletando ProductionSessions...");
    await prisma.productionSession.deleteMany({});
    console.log("   ✅ ProductionSessions deletados");

    console.log("7. Deletando ProductionConsumptions...");
    await prisma.productionConsumption.deleteMany({});
    console.log("   ✅ ProductionConsumptions deletados");

    console.log("8. Deletando InventoryMovements...");
    await prisma.inventoryMovement.deleteMany({});
    console.log("   ✅ InventoryMovements deletados");

    console.log("9. Deletando InventoryStocks...");
    await prisma.inventoryStock.deleteMany({});
    console.log("   ✅ InventoryStocks deletados");

    console.log("10. Deletando SkuTags...");
    await prisma.skuTag.deleteMany({});
    console.log("    ✅ SkuTags deletados");

    console.log("11. Deletando CapacityRules...");
    await prisma.capacityRule.deleteMany({});
    console.log("    ✅ CapacityRules deletados");

    console.log("12. Deletando SKUs...");
    await prisma.sku.deleteMany({});
    console.log("    ✅ SKUs deletados");

    console.log("13. Deletando ProductImages...");
    await prisma.productImage.deleteMany({});
    console.log("    ✅ ProductImages deletados");

    console.log("14. Deletando Products...");
    await prisma.product.deleteMany({});
    console.log("    ✅ Products deletados");

    console.log("15. Deletando Categories...");
    await prisma.category.deleteMany({});
    console.log("    ✅ Categories deletados");

    console.log("16. Deletando AuditLogs...");
    await prisma.auditLog.deleteMany({});
    console.log("    ✅ AuditLogs deletados");

    // NOTA: Mantendo Users para não perder acesso ao sistema
    // Se quiser deletar também, descomente as linhas abaixo:
    // console.log("17. Deletando Users...");
    // await prisma.user.deleteMany({});
    // console.log("    ✅ Users deletados");

    console.log("\n✅ LIMPEZA COMPLETA FINALIZADA!");
    console.log("📝 Nota: Users foram mantidos para preservar acesso ao sistema.");
    console.log("   Se quiser deletar users também, edite o script.\n");

  } catch (error) {
    console.error("\n❌ ERRO durante a limpeza:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar
clearAllData()
  .then(() => {
    console.log("✨ Script executado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Erro fatal:", error);
    process.exit(1);
  });
