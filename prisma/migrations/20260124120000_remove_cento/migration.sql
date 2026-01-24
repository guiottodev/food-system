-- 1) SKUs: CENTO -> UNIDADE, preço/100, unitLabel 'un'
UPDATE "skus"
SET "unitType" = 'UNIDADE',
    "unitLabel" = 'un',
    "priceCurrent" = "priceCurrent" / 100
WHERE "unitType" = 'CENTO';

-- 2) order_items: snapshot CENTO -> UNIDADE, qty*100, price/100
UPDATE "order_items"
SET "snapshotUnitType" = 'UNIDADE',
    "snapshotUnitLabel" = 'un',
    "quantity" = "quantity" * 100,
    "priceAtTime" = "priceAtTime" / 100
WHERE "snapshotUnitType" = 'CENTO';

-- 3) Triggers: só KG e UNIDADE
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
