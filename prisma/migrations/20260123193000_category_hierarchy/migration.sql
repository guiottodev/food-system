-- Category hierarchy (parentId) + unique per parent + unique root names
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_categories" ("active", "createdAt", "description", "id", "name", "updatedAt")
SELECT "active", "createdAt", "description", "id", "name", "updatedAt"
FROM "categories";

DROP TABLE "categories";
ALTER TABLE "new_categories" RENAME TO "categories";

CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");
CREATE UNIQUE INDEX "categories_parentId_name_key" ON "categories"("parentId", "name");
-- SQLite UNIQUE with NULL allows multiple roots; enforce unique root names with partial index.
CREATE UNIQUE INDEX "categories_root_name_key" ON "categories"("name") WHERE "parentId" IS NULL;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

