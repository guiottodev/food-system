const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const VALID = new Set(["KG", "UNIDADE"]);

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

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));

  const rows = await prisma.sku.findMany({
    distinct: ["unitType"],
    select: { unitType: true },
  });

  const invalid = rows
    .map((row) => row.unitType)
    .filter((value) => !VALID.has(value));

  if (invalid.length) {
    console.error(
      `Invalid UnitType values found in skus: ${invalid.join(
        ", "
      )}. Run prisma migrate deploy.`
    );
    process.exit(1);
  }

  console.log("UnitType integrity OK.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
