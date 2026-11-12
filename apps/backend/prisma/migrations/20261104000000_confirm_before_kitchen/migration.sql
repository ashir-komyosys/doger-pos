ALTER TABLE "orders" ADD COLUMN "sentToKitchenAt" TIMESTAMP(3);

-- Existing orders with kitchen tickets were already sent; preserve that fact.
UPDATE "orders" o
SET "sentToKitchenAt" = o."createdAt"
WHERE EXISTS (SELECT 1 FROM "kots" k WHERE k."orderId" = o."id");
