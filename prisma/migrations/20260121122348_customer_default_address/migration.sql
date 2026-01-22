-- AlterTable
ALTER TABLE "customers" ADD COLUMN "addressDefaultText" TEXT;
ALTER TABLE "customers" ADD COLUMN "addressDefaultBairro" TEXT;
ALTER TABLE "customers" ADD COLUMN "addressDefaultReferencia" TEXT;
ALTER TABLE "customers" ADD COLUMN "addressDefaultCity" TEXT;
ALTER TABLE "customers" ADD COLUMN "addressDefaultCep" TEXT;

-- Normalize phone digits
UPDATE "customers"
SET "phone" = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("phone", "(", ""), ")", ""), "-", ""), " ", ""), "+", "");

UPDATE "customers"
SET "phone" = CASE
  WHEN length("phone") = 13 AND substr("phone", 1, 2) = '55' THEN substr("phone", 3)
  ELSE "phone"
END;

-- Deduplicate customers by normalized phone (keep oldest)
WITH ranked AS (
  SELECT
    id,
    phone,
    createdAt,
    FIRST_VALUE(id) OVER (PARTITION BY phone ORDER BY createdAt) AS keep_id,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY createdAt) AS rn
  FROM "customers"
)
UPDATE "orders"
SET "customerId" = (SELECT keep_id FROM ranked r WHERE r.id = "orders"."customerId")
WHERE "customerId" IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT
    id,
    phone,
    createdAt,
    FIRST_VALUE(id) OVER (PARTITION BY phone ORDER BY createdAt) AS keep_id,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY createdAt) AS rn
  FROM "customers"
)
UPDATE "customer_addresses"
SET "customerId" = (SELECT keep_id FROM ranked r WHERE r.id = "customer_addresses"."customerId")
WHERE "customerId" IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT
    id,
    phone,
    createdAt,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY createdAt) AS rn
  FROM "customers"
)
DELETE FROM "customers"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
