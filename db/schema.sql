CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key  TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
