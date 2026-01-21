-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "deliveryDatetime" DATETIME,
    "deliveryMethod" TEXT NOT NULL,
    "addressText" TEXT,
    "addressBairro" TEXT,
    "addressReferencia" TEXT,
    "addressCity" TEXT,
    "addressCep" TEXT,
    "deliveryFee" DECIMAL,
    "subtotal" DECIMAL NOT NULL,
    "total" DECIMAL NOT NULL,
    "notes" TEXT,
    "cancellationReason" TEXT,
    "confirmedAt" DATETIME,
    "needsReconfirmation" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "stockDecrementedAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_orders" (
    "id",
    "orderNumber",
    "customerId",
    "status",
    "orderType",
    "deliveryDatetime",
    "deliveryMethod",
    "addressText",
    "addressBairro",
    "addressReferencia",
    "addressCity",
    "addressCep",
    "deliveryFee",
    "subtotal",
    "total",
    "notes",
    "cancellationReason",
    "confirmedAt",
    "needsReconfirmation",
    "paidAt",
    "stockDecrementedAt",
    "createdById",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "orderNumber",
    "customerId",
    CASE
      WHEN "status" = 'Novo' THEN 'Rascunho'
      ELSE "status"
    END,
    "orderType",
    "deliveryDatetime",
    "deliveryMethod",
    "addressText",
    "addressBairro",
    "addressReferencia",
    "addressCity",
    "addressCep",
    "deliveryFee",
    "subtotal",
    "total",
    "notes",
    "cancellationReason",
    NULL,
    0,
    NULL,
    "stockDecrementedAt",
    "createdById",
    "createdAt",
    "updatedAt"
FROM "orders";
DROP TABLE "orders";
ALTER TABLE "new_orders" RENAME TO "orders";
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE INDEX "orders_status_deliveryDatetime_idx" ON "orders"("status", "deliveryDatetime");
CREATE INDEX "orders_deliveryMethod_deliveryDatetime_idx" ON "orders"("deliveryMethod", "deliveryDatetime");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
