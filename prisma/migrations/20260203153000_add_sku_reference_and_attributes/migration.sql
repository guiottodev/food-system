-- Add normalized name columns
ALTER TABLE "products" ADD COLUMN "nameNormalized" TEXT NOT NULL DEFAULT '';

ALTER TABLE "skus" ADD COLUMN "displayNameNormalized" TEXT NOT NULL DEFAULT '';
ALTER TABLE "skus" ADD COLUMN "referencia" TEXT;
ALTER TABLE "skus" ADD COLUMN "referenciaNormalized" TEXT;

-- New attribute catalog tables
CREATE TABLE "atributos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "nameNormalized" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "unit" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "atributo_valores" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "atributoId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "atributo_valores_atributoId_fkey"
    FOREIGN KEY ("atributoId") REFERENCES "atributos" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "sku_atributos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "skuId" TEXT NOT NULL,
  "atributoId" TEXT NOT NULL,
  "atributoValorId" TEXT,
  "valueText" TEXT,
  CONSTRAINT "sku_atributos_skuId_fkey"
    FOREIGN KEY ("skuId") REFERENCES "skus" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sku_atributos_atributoId_fkey"
    FOREIGN KEY ("atributoId") REFERENCES "atributos" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sku_atributos_atributoValorId_fkey"
    FOREIGN KEY ("atributoValorId") REFERENCES "atributo_valores" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Backfill normalized columns
UPDATE "products" SET "nameNormalized" = lower(trim("name"));
UPDATE "skus" SET "displayNameNormalized" = lower(trim("displayName"));

UPDATE "skus"
SET "referencia" = NULL
WHERE "referencia" IS NOT NULL AND trim("referencia") = '';

UPDATE "skus"
SET "referenciaNormalized" = lower(trim("referencia"))
WHERE "referencia" IS NOT NULL;

-- Dedupe references before unique constraint
UPDATE "skus"
SET "referencia" = NULL,
    "referenciaNormalized" = NULL
WHERE "referenciaNormalized" IS NOT NULL
  AND "id" NOT IN (
    SELECT MIN("id")
    FROM "skus"
    WHERE "referenciaNormalized" IS NOT NULL
    GROUP BY "referenciaNormalized"
  );

-- Indexes and constraints
CREATE INDEX "products_nameNormalized_idx" ON "products"("nameNormalized");
CREATE INDEX "skus_displayNameNormalized_idx" ON "skus"("displayNameNormalized");
CREATE INDEX "skus_referenciaNormalized_idx" ON "skus"("referenciaNormalized");
CREATE UNIQUE INDEX "skus_referenciaNormalized_key" ON "skus"("referenciaNormalized");

CREATE UNIQUE INDEX "atributos_nameNormalized_key" ON "atributos"("nameNormalized");
CREATE INDEX "atributos_nameNormalized_idx" ON "atributos"("nameNormalized");
CREATE INDEX "atributo_valores_atributoId_idx" ON "atributo_valores"("atributoId");

CREATE UNIQUE INDEX "sku_atributos_skuId_atributoId_key" ON "sku_atributos"("skuId", "atributoId");
CREATE INDEX "sku_atributos_skuId_idx" ON "sku_atributos"("skuId");
CREATE INDEX "sku_atributos_atributoId_idx" ON "sku_atributos"("atributoId");
CREATE INDEX "sku_atributos_atributoValorId_idx" ON "sku_atributos"("atributoValorId");
