/*
  Warnings:

  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "document" TEXT,
    "notes" TEXT,
    "isAnonymized" BOOLEAN NOT NULL DEFAULT false,
    "addressCep" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_customers" ("createdAt", "document", "email", "id", "isAnonymized", "name", "notes", "phone")
SELECT
  "createdAt",
  "document",
  "email",
  "id",
  "isAnonymized",
  "name",
  "notes",
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE("phone", ""), " ", ""), "(", ""), ")", ""), "-", ""), ".", ""), "+", "")
FROM "customers";
DROP TABLE "customers";
ALTER TABLE "new_customers" RENAME TO "customers";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
