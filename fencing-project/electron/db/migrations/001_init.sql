PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS fencers(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  club TEXT,
  weapon TEXT,
  is_valid INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS schema_migrations(id TEXT PRIMARY KEY);

PRAGMA foreign_keys=ON;
