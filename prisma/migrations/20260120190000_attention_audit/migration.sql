-- AlterTable
ALTER TABLE "orders" ADD COLUMN "deliveryTime" TEXT;

UPDATE "orders"
SET "deliveryTime" = '00:00'
WHERE "deliveryDatetime" IS NOT NULL
  AND "deliveryTime" IS NULL;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "field" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "beforeValue" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "afterValue" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "reason" TEXT;
