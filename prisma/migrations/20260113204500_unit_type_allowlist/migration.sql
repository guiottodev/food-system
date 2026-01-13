DROP TRIGGER IF EXISTS "skus_unitType_validate_insert";
DROP TRIGGER IF EXISTS "skus_unitType_validate_update";

CREATE TRIGGER IF NOT EXISTS "skus_unitType_validate_insert"
BEFORE INSERT ON "skus"
FOR EACH ROW
BEGIN
  SELECT
    CASE
      WHEN NEW."unitType" NOT IN ('KG', 'UNIDADE', 'CENTO')
        THEN RAISE(ABORT, 'Invalid unitType. Allowed: KG, UNIDADE, CENTO')
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
END;
