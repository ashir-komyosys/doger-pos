ALTER TABLE "orders" ADD COLUMN "assignedServerId" TEXT;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_assignedServerId_fkey"
FOREIGN KEY ("assignedServerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
