-- Normalize legacy unitType values
UPDATE "skus"
SET "unitType" = 'KG',
    "unitLabel" = 'kg'
WHERE "unitType" IN ('g', 'G', 'gram', 'grams')
  AND "quantityStep" IS NOT NULL
  AND "quantityStep" < 1;

UPDATE "skus"
SET "unitType" = 'UNIDADE',
    "unitLabel" = 'un'
WHERE "unitType" IN ('g', 'G', 'gram', 'grams')
  AND ("quantityStep" IS NULL OR "quantityStep" >= 1);

UPDATE "skus"
SET "unitType" = 'KG',
    "unitLabel" = 'kg'
WHERE "unitType" IN ('kg', 'KG');

UPDATE "skus"
SET "unitType" = 'UNIDADE',
    "unitLabel" = 'un'
WHERE "unitType" IN ('un', 'UN', 'unit', 'UNIDADE', 'unidade');

UPDATE "skus"
SET "unitType" = 'CENTO',
    "unitLabel" = 'cento'
WHERE "unitType" IN ('cento', 'CENTO');

UPDATE "skus"
SET "unitLabel" = 'kg'
WHERE "unitType" = 'KG'
  AND ("unitLabel" IS NULL OR "unitLabel" <> 'kg');

UPDATE "skus"
SET "unitLabel" = 'un'
WHERE "unitType" = 'UNIDADE'
  AND ("unitLabel" IS NULL OR "unitLabel" <> 'un');

UPDATE "skus"
SET "unitLabel" = 'cento'
WHERE "unitType" = 'CENTO'
  AND ("unitLabel" IS NULL OR "unitLabel" <> 'cento');

-- Enforce valid unitType and unitLabel values
CREATE TRIGGER IF NOT EXISTS "skus_unitType_validate_insert"
BEFORE INSERT ON "skus"
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW."unitType" NOT IN ('KG', 'UNIDADE', 'CENTO')
        THEN RAISE(ABORT, 'Invalid unitType. Allowed: KG, UNIDADE, CENTO')
    END;
  SELECT
    CASE
      WHEN NEW."unitType" = 'KG' AND NEW."unitLabel" <> 'kg'
        THEN RAISE(ABORT, 'Invalid unitLabel for KG. Expected: kg')
      WHEN NEW."unitType" = 'UNIDADE' AND NEW."unitLabel" <> 'un'
        THEN RAISE(ABORT, 'Invalid unitLabel for UNIDADE. Expected: un')
      WHEN NEW."unitType" = 'CENTO' AND NEW."unitLabel" <> 'cento'
        THEN RAISE(ABORT, 'Invalid unitLabel for CENTO. Expected: cento')
    END;
END;

CREATE TRIGGER IF NOT EXISTS "skus_unitType_validate_update"
BEFORE UPDATE ON "skus"
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW."unitType" NOT IN ('KG', 'UNIDADE', 'CENTO')
        THEN RAISE(ABORT, 'Invalid unitType. Allowed: KG, UNIDADE, CENTO')
    END;
  SELECT
    CASE
      WHEN NEW."unitType" = 'KG' AND NEW."unitLabel" <> 'kg'
        THEN RAISE(ABORT, 'Invalid unitLabel for KG. Expected: kg')
      WHEN NEW."unitType" = 'UNIDADE' AND NEW."unitLabel" <> 'un'
        THEN RAISE(ABORT, 'Invalid unitLabel for UNIDADE. Expected: un')
      WHEN NEW."unitType" = 'CENTO' AND NEW."unitLabel" <> 'cento'
        THEN RAISE(ABORT, 'Invalid unitLabel for CENTO. Expected: cento')
    END;
END;
