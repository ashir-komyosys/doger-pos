-- Public customer website: an opaque per-branch token so customers can
-- browse the menu and place takeaway/delivery orders from outside the
-- restaurant (see /public/<token>). Null = public website off for the
-- branch. Backfilled as NULL for existing branches; enable per branch in
-- Settings once the menu is ready for public viewing.
--
-- A plain UNIQUE index is used (matching the kioskToken migration): in
-- PostgreSQL, NULL values on a UNIQUE index are considered distinct, so
-- existing branches with NULL publicToken don't conflict with each other.

ALTER TABLE "branches" ADD COLUMN "publicToken" TEXT;
CREATE UNIQUE INDEX "branches_publicToken_key" ON "branches"("publicToken");
