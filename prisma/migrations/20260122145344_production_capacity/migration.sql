-- CreateTable
CREATE TABLE "production_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "producedAt" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "production_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_session_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "production_session_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "production_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "production_session_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "production_consumptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL NOT NULL,
    "consumedAt" DATETIME NOT NULL,
    "sourceType" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "production_consumptions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "production_consumptions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "production_sessions_producedAt_idx" ON "production_sessions"("producedAt");

-- CreateIndex
CREATE INDEX "production_session_items_productId_idx" ON "production_session_items"("productId");

-- CreateIndex
CREATE INDEX "production_session_items_sessionId_idx" ON "production_session_items"("sessionId");

-- CreateIndex
CREATE INDEX "production_consumptions_productId_idx" ON "production_consumptions"("productId");

-- CreateIndex
CREATE INDEX "production_consumptions_consumedAt_idx" ON "production_consumptions"("consumedAt");
