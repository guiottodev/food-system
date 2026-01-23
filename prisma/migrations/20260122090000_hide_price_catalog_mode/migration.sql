-- Add hidePriceInCatalogMode to SKUs (catalog price visibility override)
ALTER TABLE "skus" ADD COLUMN "hidePriceInCatalogMode" TEXT NOT NULL DEFAULT 'INHERIT';

UPDATE "skus"
SET "hidePriceInCatalogMode" = CASE
  WHEN "isSobConsultaOverride" = 1 THEN 'FORCE_HIDE'
  WHEN "isSobConsultaOverride" = 0 THEN 'FORCE_SHOW'
  ELSE 'INHERIT'
END;
