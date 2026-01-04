-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sku_tags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sku_tags_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "defaultDailyCapacity" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_categories" ("createdAt", "defaultDailyCapacity", "id", "name") SELECT "createdAt", "defaultDailyCapacity", "id", "name" FROM "categories";
DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "leadTimeHours" INTEGER NOT NULL DEFAULT 0,
    "notesInternal" TEXT,
    "descriptionLong" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isPublicHidden" BOOLEAN NOT NULL DEFAULT false,
    "isSobConsultaDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_products" ("active", "categoryId", "createdAt", "id", "name") SELECT "active", "categoryId", "createdAt", "id", "name" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_name_categoryId_key" ON "products"("name", "categoryId");
CREATE TABLE "new_skus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '',
    "flavor" TEXT NOT NULL DEFAULT '',
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantityStep" DECIMAL NOT NULL,
    "priceCurrent" DECIMAL NOT NULL,
    "cost" DECIMAL,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isSobConsultaOverride" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "skus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_skus" ("active", "createdAt", "displayName", "id", "isCritical", "priceCurrent", "productId", "quantityStep", "unitLabel", "unitType") SELECT "active", "createdAt", "displayName", "id", "isCritical", "priceCurrent", "productId", "quantityStep", "unitLabel", "unitType" FROM "skus";
DROP TABLE "skus";
ALTER TABLE "new_skus" RENAME TO "skus";
CREATE UNIQUE INDEX "skus_productId_displayName_key" ON "skus"("productId", "displayName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "product_images_productId_sortOrder_idx" ON "product_images"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "sku_tags_skuId_idx" ON "sku_tags"("skuId");

-- CreateIndex
CREATE UNIQUE INDEX "sku_tags_skuId_name_key" ON "sku_tags"("skuId", "name");
