PRAGMA foreign_keys=OFF;

-- Add pending production column to skus
ALTER TABLE "skus" ADD COLUMN "pendingProductionQuantity" DECIMAL NOT NULL DEFAULT 0;

-- Rebuild production_session_items with skuId
CREATE TABLE "production_session_items_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "production_session_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "production_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_session_items_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "production_session_items_new" ("id", "sessionId", "skuId", "quantity", "note")
SELECT
    i."id",
    i."sessionId",
    (
        SELECT s."id"
        FROM "skus" s
        WHERE s."productId" = i."productId"
        ORDER BY s."createdAt" ASC
        LIMIT 1
    ) AS "skuId",
    i."quantity",
    i."note"
FROM "production_session_items" i;

DROP TABLE "production_session_items";
ALTER TABLE "production_session_items_new" RENAME TO "production_session_items";

CREATE INDEX "production_session_items_skuId_idx" ON "production_session_items"("skuId");
CREATE INDEX "production_session_items_sessionId_idx" ON "production_session_items"("sessionId");

-- Rebuild production_consumptions with skuId
CREATE TABLE "production_consumptions_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "consumedAt" DATETIME NOT NULL,
    "sourceType" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "production_consumptions_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "skus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "production_consumptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "production_consumptions_new" ("id", "skuId", "quantity", "consumedAt", "sourceType", "note", "createdAt", "createdById")
SELECT
    c."id",
    (
        SELECT s."id"
        FROM "skus" s
        WHERE s."productId" = c."productId"
        ORDER BY s."createdAt" ASC
        LIMIT 1
    ) AS "skuId",
    c."quantity",
    c."consumedAt",
    c."sourceType",
    c."note",
    c."createdAt",
    c."createdById"
FROM "production_consumptions" c;

DROP TABLE "production_consumptions";
ALTER TABLE "production_consumptions_new" RENAME TO "production_consumptions";

CREATE INDEX "production_consumptions_skuId_idx" ON "production_consumptions"("skuId");
CREATE INDEX "production_consumptions_consumedAt_idx" ON "production_consumptions"("consumedAt");

PRAGMA foreign_keys=ON;
