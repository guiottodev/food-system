const { PrismaClient } = require("@prisma/client");

const { normalizeUnitType, unitLabelFor } = require("../lib/unit");
const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USER || "admin";

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      name: "Administrador",
      role: "ADMIN",
    },
  });

  const skuCount = await prisma.sku.count();
  if (skuCount === 0) {
    const category = await prisma.category.create({
      data: {
        name: "Salgados",
      },
    });

    const productA = await prisma.product.create({
      data: {
        name: "Coxinha",
        categoryId: category.id,
      },
    });

    const productB = await prisma.product.create({
      data: {
        name: "Bolo",
        categoryId: category.id,
      },
    });

    const skus = await prisma.sku.createMany({
      data: [
        {
          productId: productA.id,
          sizeText: "25g",
          flavorText: "Frango",
          isFrozen: true,
          displayName: "Coxinha 25g Frango Congelada",
          unitType: normalizeUnitType("CENTO"),
          unitLabel: "cento",
          quantityStep: 1,
          minQty: 1,
          priceCurrent: 120.0,
        },
        {
          productId: productA.id,
          sizeText: "25g",
          flavorText: "Frango",
          isFrozen: false,
          displayName: "Coxinha 25g Frango Frita",
          unitType: normalizeUnitType("CENTO"),
          unitLabel: "cento",
          quantityStep: 1,
          minQty: 1,
          priceCurrent: 130.0,
        },
        {
          productId: productB.id,
          sizeText: "1kg",
          flavorText: "Chocolate",
          isFrozen: false,
          displayName: "Bolo Chocolate",
          unitType: normalizeUnitType("KG"),
          unitLabel: unitLabelFor("KG"),
          quantityStep: 0.1,
          minQty: 0.1,
          priceCurrent: 45.0,
        },
        {
          productId: productB.id,
          sizeText: "1kg",
          flavorText: "Cenoura",
          isFrozen: false,
          displayName: "Bolo Cenoura",
          unitType: normalizeUnitType("KG"),
          unitLabel: unitLabelFor("KG"),
          quantityStep: 0.1,
          minQty: 0.1,
          priceCurrent: 42.0,
        },
      ],
    });

    const createdSkus = await prisma.sku.findMany({
      where: { productId: { in: [productA.id, productB.id] } },
    });
    if (createdSkus.length) {
      await prisma.inventoryStock.createMany({
        data: createdSkus.map((sku) => ({
          skuId: sku.id,
          quantity: 0,
        })),
      });
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
