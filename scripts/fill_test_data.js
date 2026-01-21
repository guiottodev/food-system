const fs = require("fs");
const path = require("path");
const { PrismaClient, Prisma } = require("@prisma/client");
const { normalizeUnitType } = require("../lib/unit");

const TAG = "[SEED_FAKE]";
const prisma = new PrismaClient();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function parseArgs(argv) {
  const args = {
    count: 1000,
    pastDays: 90,
    futureDays: 30,
    reset: false,
  };

  argv.forEach((arg) => {
    if (arg === "--reset") {
      args.reset = true;
      return;
    }
    const [key, value] = arg.split("=");
    if (!value) return;
    if (key === "--count") args.count = Number(value);
    if (key === "--pastDays") args.pastDays = Number(value);
    if (key === "--futureDays") args.futureDays = Number(value);
  });

  return args;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(list) {
  return list[randInt(0, list.length - 1)];
}

function randomDateBetween(start, end) {
  const ts = randInt(start.getTime(), end.getTime());
  return new Date(ts);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDecimal(value) {
  return new Prisma.Decimal(value);
}

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

async function resetData() {
  const orders = await prisma.order.findMany({
    where: { notes: { contains: TAG } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length) {
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  const customers = await prisma.customer.findMany({
    where: { notes: { contains: TAG } },
    select: { id: true },
  });
  const customerIds = customers.map((c) => c.id);
  if (customerIds.length) {
    await prisma.customerAddress.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
  }

  const skus = await prisma.sku.findMany({
    where: { displayName: { contains: TAG } },
    select: { id: true },
  });
  const skuIds = skus.map((s) => s.id);
  if (skuIds.length) {
    await prisma.inventoryStock.deleteMany({
      where: { skuId: { in: skuIds } },
    });
    await prisma.sku.deleteMany({ where: { id: { in: skuIds } } });
  }

  await prisma.product.deleteMany({
    where: { name: { contains: TAG } },
  });
  await prisma.category.deleteMany({
    where: { name: { contains: TAG } },
  });
}

async function ensureSkus(minCount) {
  const skuCount = await prisma.sku.count();
  if (skuCount >= minCount) return;

    const category = await prisma.category.create({
      data: {
        name: `${TAG} Categoria Base`,
      },
    });

  const products = [];
  for (let i = 1; i <= 5; i += 1) {
    products.push(
      await prisma.product.create({
        data: {
          name: `${TAG} Produto ${i}`,
          categoryId: category.id,
        },
      })
    );
  }

  const unitTypes = [
    { unitType: "UNIDADE", unitLabel: "un", step: 1, minQty: 1 },
    { unitType: "CENTO", unitLabel: "cento", step: 1, minQty: 1 },
    { unitType: "KG", unitLabel: "kg", step: 0.05, minQty: 0.5 },
  ];

  const skuData = [];
  for (let i = 1; i <= minCount; i += 1) {
    const product = products[i % products.length];
    const unit = unitTypes[i % unitTypes.length];
    const normalizedUnit = normalizeUnitType(unit.unitType);
    skuData.push({
      productId: product.id,
      sizeText: unit.unitType === "KG" ? "1kg" : "25g",
      flavorText: `Sabor ${i}`,
      isFrozen: i % 2 === 0,
      displayName: `${TAG} SKU ${String(i).padStart(2, "0")}`,
      unitLabel: unit.unitLabel,
      unitType: normalizedUnit,
      quantityStep: toDecimal(unit.step),
      minQty: toDecimal(unit.minQty),
      priceCurrent: toDecimal(randInt(10, 180)),
    });
  }

  await prisma.sku.createMany({ data: skuData });
}

async function getOrderNumberCounters(startYear, endYear) {
  const counters = {};
  for (let year = startYear; year <= endYear; year += 1) {
    const prefix = `${year}-`;
    const latest = await prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: "desc" },
      select: { orderNumber: true },
    });
    const next =
      latest?.orderNumber && latest.orderNumber.startsWith(prefix)
        ? Number(latest.orderNumber.slice(prefix.length)) + 1
        : 1;
    counters[year] = next;
  }
  return counters;
}

function nextOrderNumber(counters, date) {
  const year = date.getFullYear();
  const next = counters[year] ?? 1;
  counters[year] = next + 1;
  return `${year}-${String(next).padStart(6, "0")}`;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  const args = parseArgs(process.argv.slice(2));

  if (args.reset) {
    await resetData();
  }

  await ensureSkus(20);

  const skus = await prisma.sku.findMany({
    select: {
      id: true,
      displayName: true,
      unitLabel: true,
      unitType: true,
      quantityStep: true,
      sizeText: true,
      flavorText: true,
      isFrozen: true,
      isSobConsultaOverride: true,
      priceCurrent: true,
      product: {
        select: {
          isSobConsulta: true,
        },
      },
    },
  });

  if (!skus.length) {
    throw new Error("Nenhum SKU encontrado para gerar pedidos.");
  }

  const now = new Date();
  const startDate = addDays(now, -args.pastDays);
  const endDate = addDays(now, args.futureDays);
  const counters = await getOrderNumberCounters(
    startDate.getFullYear(),
    endDate.getFullYear()
  );

  const customerCount = Math.max(20, Math.round(args.count / 5));
  const customers = [];
  for (let i = 1; i <= customerCount; i += 1) {
    const customer = await prisma.customer.create({
      data: {
        name: `Cliente Fake ${String(i).padStart(3, "0")}`,
        phone: `1199${String(100000 + i).padStart(6, "0")}`,
        notes: `${TAG} cliente fake`,
      },
    });
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        addressText: `${TAG} Rua ${i}, ${randInt(10, 500)}`,
        addressBairro: "Centro",
        addressReferencia: "Proximo ao mercado",
        addressCity: "Sao Paulo",
        isDefault: true,
      },
    });
    customers.push(customer);
  }

  let minDelivery = null;
  let maxDelivery = null;

  for (let i = 0; i < args.count; i += 1) {
    const customer = sample(customers);
    const deliveryDatetime = randomDateBetween(startDate, endDate);
    const orderNumber = nextOrderNumber(counters, deliveryDatetime);
    const deliveryMethod = Math.random() < 0.6 ? "ENTREGA" : "RETIRADA";
    const orderType = Math.random() < 0.5 ? "PRONTA_ENTREGA" : "ENCOMENDA";
    const statusPool = [
      "RASCUNHO",
      "CONFIRMADO",
      "EM_PRODUCAO",
      "PRONTO",
      "ENTREGUE",
      "CANCELADO",
    ];
    const status = sample(statusPool);

    const itemsCount = randInt(3, 8);
    const selectedSkus = new Set();
    const items = [];

    while (items.length < itemsCount) {
      const sku = sample(skus);
      if (selectedSkus.has(sku.id)) continue;
      selectedSkus.add(sku.id);
      const step = Number(sku.quantityStep);
      const multiplier = sku.unitType === "KG" ? randInt(1, 12) : randInt(1, 6);
      const quantity = Number((step * multiplier).toFixed(3));
      const priceAtTime = Number(sku.priceCurrent);
      const lineTotal = Number((quantity * priceAtTime).toFixed(2));
      const snapshotIsSobConsulta =
        sku.isSobConsultaOverride === true
          ? true
          : sku.isSobConsultaOverride === false
          ? false
          : sku.product.isSobConsulta;
      items.push({
        skuId: sku.id,
        quantity,
        priceAtTime,
        lineTotal,
        snapshot: {
          snapshotDisplayName: sku.displayName,
          snapshotUnitLabel: sku.unitLabel,
          snapshotUnitType: sku.unitType,
          snapshotSizeText: sku.sizeText || null,
          snapshotFlavorText: sku.flavorText || null,
          snapshotIsFrozen: sku.isFrozen,
          snapshotIsSobConsulta,
        },
      });
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const deliveryFee = deliveryMethod === "ENTREGA" ? randInt(0, 20) : 0;
    const total = subtotal + deliveryFee;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status,
        orderType,
        deliveryDatetime,
        deliveryTime: formatTime(deliveryDatetime),
        deliveryMethod,
        addressText: deliveryMethod === "ENTREGA" ? `${TAG} Rua teste` : null,
        addressBairro: deliveryMethod === "ENTREGA" ? "Centro" : null,
        addressReferencia:
          deliveryMethod === "ENTREGA" ? "Perto da padaria" : null,
        addressCity: deliveryMethod === "ENTREGA" ? "Sao Paulo" : null,
        deliveryFee: toDecimal(deliveryFee),
        subtotal: toDecimal(subtotal),
        total: toDecimal(total),
        notes: `${TAG} pedido fake`,
        cancellationReason:
          status === "CANCELADO" ? "Cancelado para teste" : null,
      },
    });

    await prisma.orderItem.createMany({
      data: items.map((item) => ({
        orderId: order.id,
        skuId: item.skuId,
        quantity: toDecimal(item.quantity),
        snapshotDisplayName: item.snapshot.snapshotDisplayName,
        snapshotUnitLabel: item.snapshot.snapshotUnitLabel,
        snapshotUnitType: item.snapshot.snapshotUnitType,
        snapshotSizeText: item.snapshot.snapshotSizeText,
        snapshotFlavorText: item.snapshot.snapshotFlavorText,
        snapshotIsFrozen: item.snapshot.snapshotIsFrozen,
        snapshotIsSobConsulta: item.snapshot.snapshotIsSobConsulta,
        priceAtTime: toDecimal(item.priceAtTime),
        lineTotal: toDecimal(item.lineTotal),
      })),
    });

    if (!minDelivery || deliveryDatetime < minDelivery) {
      minDelivery = deliveryDatetime;
    }
    if (!maxDelivery || deliveryDatetime > maxDelivery) {
      maxDelivery = deliveryDatetime;
    }
  }

  console.log("Resumo:");
  console.log(`Pedidos criados: ${args.count}`);
  console.log(`Clientes criados: ${customerCount}`);
  console.log(`SKUs disponiveis: ${skus.length}`);
  if (minDelivery && maxDelivery) {
    console.log(
      `Entrega: ${minDelivery.toISOString()} -> ${maxDelivery.toISOString()}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
