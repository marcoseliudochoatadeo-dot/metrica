-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "totalMl" INTEGER NOT NULL DEFAULT 750,
    "currentMl" INTEGER NOT NULL DEFAULT 750,
    "openBottles" INTEGER NOT NULL DEFAULT 1,
    "fullBottles" INTEGER NOT NULL DEFAULT 0,
    "tareWeight" REAL NOT NULL DEFAULT 450,
    "density" REAL NOT NULL DEFAULT 0.95,
    "minStock" INTEGER NOT NULL DEFAULT 2,
    "costPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "costPrice", "createdAt", "currentMl", "fullBottles", "id", "minStock", "name", "totalMl", "updatedAt") SELECT "category", "costPrice", "createdAt", "currentMl", "fullBottles", "id", "minStock", "name", "totalMl", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
