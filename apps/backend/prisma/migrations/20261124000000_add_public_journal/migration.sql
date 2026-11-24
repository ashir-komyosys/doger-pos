CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "excerpt" VARCHAR(320) NOT NULL,
    "content" TEXT NOT NULL,
    "coverImageUrl" VARCHAR(2048),
    "seoTitle" VARCHAR(70),
    "seoDescription" VARCHAR(170),
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_posts_branchId_slug_key" ON "blog_posts"("branchId", "slug");
CREATE INDEX "blog_posts_branchId_status_publishedAt_idx" ON "blog_posts"("branchId", "status", "publishedAt");

ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
