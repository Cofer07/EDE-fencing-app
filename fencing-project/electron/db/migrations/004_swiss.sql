PRAGMA foreign_keys=OFF;

-- Swiss tournament core tables
CREATE TABLE IF NOT EXISTS swiss_tournaments (
  id INTEGER PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now')),
  total_rounds INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS swiss_rounds (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES swiss_tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  UNIQUE(tournament_id, round_number)
);

CREATE TABLE IF NOT EXISTS swiss_matches (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES swiss_tournaments(id) ON DELETE CASCADE,
  round_id INTEGER NOT NULL REFERENCES swiss_rounds(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  fencer_a_id INTEGER NOT NULL REFERENCES fencers(id) ON DELETE CASCADE,
  fencer_b_id INTEGER,
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  finished INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tournament_id, round_number, fencer_a_id, fencer_b_id)
);

CREATE INDEX IF NOT EXISTS idx_swiss_matches_tour_round ON swiss_matches(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_swiss_matches_fencers ON swiss_matches(fencer_a_id, fencer_b_id);
