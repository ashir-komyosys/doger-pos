CREATE TYPE "InventoryDeductionTiming" AS ENUM ('CHECKOUT', 'KITCHEN_READY');

CREATE TYPE "StockReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

ALTER TABLE "orders"
ADD COLUMN "inventoryDeductionTiming" "InventoryDeductionTiming" NOT NULL DEFAULT 'KITCHEN_READY';

-- Existing orders retain the previous checkout-based deduction behavior.
UPDATE "orders"
SET "inventoryDeductionTiming" = 'CHECKOUT';

ALTER TABLE "kots"
ADD COLUMN "inventoryReservedAt" TIMESTAMP(3);

CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "kotId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_reservations_kotId_ingredientId_key"
ON "stock_reservations"("kotId", "ingredientId");

CREATE INDEX "stock_reservations_branchId_ingredientId_status_idx"
ON "stock_reservations"("branchId", "ingredientId", "status");

ALTER TABLE "stock_reservations"
ADD CONSTRAINT "stock_reservations_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_reservations"
ADD CONSTRAINT "stock_reservations_ingredientId_fkey"
FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_reservations"
ADD CONSTRAINT "stock_reservations_kotId_fkey"
FOREIGN KEY ("kotId") REFERENCES "kots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
