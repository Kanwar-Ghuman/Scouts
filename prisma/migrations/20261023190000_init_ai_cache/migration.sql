-- CreateTable
CREATE TABLE IF NOT EXISTS "ai_cache" (
    "cache_key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_cache_pkey" PRIMARY KEY ("cache_key")
);
