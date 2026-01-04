DROP TRIGGER IF EXISTS "skus_unitType_validate_insert";
DROP TRIGGER IF EXISTS "skus_unitType_validate_update";

DROP TABLE IF EXISTS "new_order_items";
DROP TABLE IF EXISTS "new_categories";
DROP TABLE IF EXISTS "new_products";
DROP TABLE IF EXISTS "new_skus";

-- Normalize legacy unitType/unitLabel values before schema changes
UPDATE "skus"
SET "unitType" = 'KG',
    "unitLabel" = 'kg'
WHERE "unitType" IN ('g', 'G', 'gram', 'grams')
  AND "quantityStep" IS NOT NULL
  AND "quantityStep" < 1;

UPDATE "skus"
SET "unitType" = 'UNIDADE',
    "unitLabel" = COALESCE(NULLIF("unitLabel", ''), 'un')
WHERE "unitType" IN ('g', 'G', 'gram', 'grams')
  AND ("quantityStep" IS NULL OR "quantityStep" >= 1);

UPDATE "skus"
SET "unitType" = 'KG',
    "unitLabel" = 'kg'
WHERE "unitType" IN ('kg', 'KG');

UPDATE "skus"
SET "unitType" = 'UNIDADE'
WHERE "unitType" IN ('un', 'UN', 'unit', 'UNIDADE', 'unidade');

UPDATE "skus"
SET "unitType" = 'UNIDADE',
    "unitLabel" = 'cento'
WHERE "unitType" IN ('CENTO', 'cento');

UPDATE "skus"
SET "unitLabel" = 'kg'
WHERE "unitType" = 'KG'
  AND ("unitLabel" IS NULL OR "unitLabel" = '');

UPDATE "skus"
SET "unitLabel" = 'un'
WHERE "unitType" = 'UNIDADE'
  AND ("unitLabel" IS NULL OR "unitLabel" = '');

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Redefine order_items with snapshot fields and nullable skuId
CREATE TABLE "new_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" DECIMAL NOT NULL,
    "snapshotDisplayName" TEXT NOT NULL DEFAULT '',
    "snapshotUnitLabel" TEXT NOT NULL DEFAULT 'un',
    "snapshotUnitType" TEXT NOT NULL DEFAULT 'UNIDADE',
    "snapshotSizeText" TEXT,
    "snapshotFlavorText" TEXT,
    "snapshotIsFrozen" BOOLEAN NOT NULL DEFAULT false,
    "snapshotIsSobConsulta" BOOLEAN NOT NULL DEFAULT false,
    "priceAtTime" DECIMAL NOT NULL,
    "lineTotal" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_order_items" (
  "id",
  "orderId",
  "skuId",
  "quantity",
  "snapshotDisplayName",
  "snapshotUnitLabel",
  "snapshotUnitType",
  "snapshotSizeText",
  "snapshotFlavorText",
  "snapshotIsFrozen",
  "snapshotIsSobConsulta",
  "priceAtTime",
  "lineTotal",
  "createdAt"
)
SELECT
  oi."id",
  oi."orderId",
  oi."skuId",
  oi."quantity",
  COALESCE(s."displayName", 'SKU removido'),
  COALESCE(s."unitLabel", 'un'),
  COALESCE(
    CASE
      WHEN s."unitType" IN ('KG', 'kg') THEN 'KG'
      WHEN s."unitType" IN ('CENTO', 'cento') THEN 'UNIDADE'
      WHEN s."unitType" IN ('UNIDADE', 'un', 'UN', 'unit', 'unidade') THEN 'UNIDADE'
      WHEN s."unitType" IN ('g', 'G', 'gram', 'grams')
        THEN CASE WHEN s."quantityStep" IS NOT NULL AND s."quantityStep" < 1 THEN 'KG' ELSE 'UNIDADE' END
      ELSE 'UNIDADE'
    END,
    'UNIDADE'
  ),
  COALESCE(s."size", ''),
  s."flavor",
  COALESCE(s."isFrozen", 0),
  CASE
    WHEN s."isSobConsultaOverride" IS NOT NULL THEN s."isSobConsultaOverride"
    ELSE COALESCE(p."isSobConsultaDefault", 0)
  END,
  oi."priceAtTime",
  oi."lineTotal",
  oi."createdAt"
FROM "order_items" oi
LEFT JOIN "skus" s ON s."id" = oi."skuId"
LEFT JOIN "products" p ON p."id" = s."productId";

DROP TABLE "order_items";
ALTER TABLE "new_order_items" RENAME TO "order_items";
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_skuId_idx" ON "order_items"("skuId");

-- Redefine categories
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_categories" ("id", "name", "description", "createdAt", "updatedAt")
SELECT "id", "name", "description", "createdAt", "updatedAt" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- Redefine products
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "leadTimeHours" INTEGER,
    "descriptionLong" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isPublicHidden" BOOLEAN NOT NULL DEFAULT false,
    "isSobConsulta" BOOLEAN NOT NULL DEFAULT false,
    "imageMainUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_products" (
  "id",
  "name",
  "categoryId",
  "leadTimeHours",
  "descriptionLong",
  "active",
  "isPublicHidden",
  "isSobConsulta",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "name",
  "categoryId",
  "leadTimeHours",
  "descriptionLong",
  "active",
  "isPublicHidden",
  "isSobConsultaDefault",
  "createdAt",
  "updatedAt"
FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_name_categoryId_key" ON "products"("name", "categoryId");

-- Redefine skus
CREATE TABLE "new_skus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sizeText" TEXT NOT NULL DEFAULT '',
    "flavorText" TEXT,
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantityStep" DECIMAL NOT NULL,
    "minQty" DECIMAL NOT NULL DEFAULT 1,
    "priceCurrent" DECIMAL NOT NULL,
    "cost" DECIMAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSobConsultaOverride" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_skus" (
  "id",
  "productId",
  "sizeText",
  "flavorText",
  "isFrozen",
  "displayName",
  "unitLabel",
  "unitType",
  "quantityStep",
  "minQty",
  "priceCurrent",
  "cost",
  "active",
  "isSobConsultaOverride",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "productId",
  "size",
  "flavor",
  "isFrozen",
  "displayName",
  "unitLabel",
  "unitType",
  "quantityStep",
  COALESCE("quantityStep", 1),
  "priceCurrent",
  "cost",
  "active",
  "isSobConsultaOverride",
  "createdAt",
  "updatedAt"
FROM "skus";
DROP TABLE "skus";
ALTER TABLE "new_skus" RENAME TO "skus";
CREATE UNIQUE INDEX "skus_productId_displayName_key" ON "skus"("productId", "displayName");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Update unitType triggers to allow only KG/UNIDADE
DROP TRIGGER IF EXISTS "skus_unitType_validate_insert";
DROP TRIGGER IF EXISTS "skus_unitType_validate_update";

CREATE TRIGGER IF NOT EXISTS "skus_unitType_validate_insert"
BEFORE INSERT ON "skus"
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW."unitType" NOT IN ('KG', 'UNIDADE')
        THEN RAISE(ABORT, 'Invalid unitType. Allowed: KG, UNIDADE')
    END;
END;

CREATE TRIGGER IF NOT EXISTS "skus_unitType_validate_update"
BEFORE UPDATE ON "skus"
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW."unitType" NOT IN ('KG', 'UNIDADE')
        THEN RAISE(ABORT, 'Invalid unitType. Allowed: KG, UNIDADE')
    END;
END;
