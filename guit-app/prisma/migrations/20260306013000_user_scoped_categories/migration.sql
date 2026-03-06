PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "new_Category"("userId", "name", "type");
CREATE INDEX "Category_userId_idx" ON "new_Category"("userId");

-- Backfill user-scoped categories from existing transaction and budget usage.
INSERT INTO "new_Category" ("userId", "name", "type")
SELECT DISTINCT t."userId", c."name", c."type"
FROM "Transaction" t
JOIN "Category" c ON c."id" = t."categoryId";

INSERT INTO "new_Category" ("userId", "name", "type")
SELECT DISTINCT b."userId", c."name", c."type"
FROM "Budget" b
JOIN "Category" c ON c."id" = b."categoryId"
LEFT JOIN "new_Category" nc
  ON nc."userId" = b."userId"
 AND nc."name" = c."name"
 AND nc."type" = c."type"
WHERE nc."id" IS NULL;

CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "new_Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Transaction" (
  "id", "userId", "accountId", "categoryId", "amount", "type", "date", "description", "createdAt", "updatedAt"
)
SELECT
  t."id",
  t."userId",
  t."accountId",
  nc."id",
  t."amount",
  t."type",
  t."date",
  t."description",
  t."createdAt",
  t."updatedAt"
FROM "Transaction" t
JOIN "Category" c ON c."id" = t."categoryId"
JOIN "new_Category" nc
  ON nc."userId" = t."userId"
 AND nc."name" = c."name"
 AND nc."type" = c."type";

CREATE TABLE "new_Budget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "new_Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Budget" (
  "id", "userId", "categoryId", "amount", "period", "createdAt", "updatedAt"
)
SELECT
  b."id",
  b."userId",
  nc."id",
  b."amount",
  b."period",
  b."createdAt",
  b."updatedAt"
FROM "Budget" b
JOIN "Category" c ON c."id" = b."categoryId"
JOIN "new_Category" nc
  ON nc."userId" = b."userId"
 AND nc."name" = c."name"
 AND nc."type" = c."type";

DROP TABLE "Transaction";
DROP TABLE "Budget";
DROP TABLE "Category";

ALTER TABLE "new_Category" RENAME TO "Category";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
ALTER TABLE "new_Budget" RENAME TO "Budget";

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
