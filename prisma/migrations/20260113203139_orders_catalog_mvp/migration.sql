-- AlterTable
ALTER TABLE "orders" ADD COLUMN "stockDecrementedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_categories" ("createdAt", "description", "id", "name", "updatedAt") SELECT "createdAt", "description", "id", "name", "updatedAt" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE TABLE "new_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT,
    "quantity" DECIMAL NOT NULL,
    "snapshotDisplayName" TEXT NOT NULL,
    "snapshotProductName" TEXT,
    "snapshotUnitLabel" TEXT NOT NULL,
    "snapshotUnitType" TEXT NOT NULL,
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
INSERT INTO "new_order_items" ("createdAt", "id", "lineTotal", "orderId", "priceAtTime", "quantity", "skuId", "snapshotDisplayName", "snapshotFlavorText", "snapshotIsFrozen", "snapshotIsSobConsulta", "snapshotSizeText", "snapshotUnitLabel", "snapshotUnitType") SELECT "createdAt", "id", "lineTotal", "orderId", "priceAtTime", "quantity", "skuId", "snapshotDisplayName", "snapshotFlavorText", "snapshotIsFrozen", "snapshotIsSobConsulta", "snapshotSizeText", "snapshotUnitLabel", "snapshotUnitType" FROM "order_items";
DROP TABLE "order_items";
ALTER TABLE "new_order_items" RENAME TO "order_items";
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_skuId_idx" ON "order_items"("skuId");
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
    "stockQuantity" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_skus" ("active", "cost", "createdAt", "displayName", "flavorText", "id", "isFrozen", "isSobConsultaOverride", "minQty", "priceCurrent", "productId", "quantityStep", "sizeText", "unitLabel", "unitType", "updatedAt") SELECT "active", "cost", "createdAt", "displayName", "flavorText", "id", "isFrozen", "isSobConsultaOverride", "minQty", "priceCurrent", "productId", "quantityStep", "sizeText", "unitLabel", "unitType", "updatedAt" FROM "skus";
DROP TABLE "skus";
ALTER TABLE "new_skus" RENAME TO "skus";
CREATE UNIQUE INDEX "skus_productId_displayName_key" ON "skus"("productId", "displayName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
