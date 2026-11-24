CREATE TABLE "public_customer_accounts" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "public_customer_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "public_customer_accounts_customerId_key" ON "public_customer_accounts"("customerId");
CREATE UNIQUE INDEX "public_customer_accounts_branchId_email_key" ON "public_customer_accounts"("branchId", "email");
ALTER TABLE "public_customer_accounts" ADD CONSTRAINT "public_customer_accounts_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public_customer_accounts" ADD CONSTRAINT "public_customer_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
