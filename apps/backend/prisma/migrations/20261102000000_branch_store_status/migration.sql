ALTER TABLE "branches"
ADD COLUMN "isStoreOpen" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "store_status_events" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_status_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_status_events_branchId_createdAt_idx"
ON "store_status_events"("branchId", "createdAt");

ALTER TABLE "store_status_events"
ADD CONSTRAINT "store_status_events_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_status_events"
ADD CONSTRAINT "store_status_events_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
