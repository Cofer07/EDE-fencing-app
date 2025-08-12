-- Divisions & full-placement DE (16)

CREATE TABLE IF NOT EXISTS divisions (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  seed_start_index INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS division_fencers (
  id INTEGER PRIMARY KEY,
  division_id INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  fencer_id INTEGER NOT NULL,
  FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS de_matches (
  id INTEGER PRIMARY KEY,
  division_id INTEGER NOT NULL,
  round_label TEXT NOT NULL,
  bracket_slot INTEGER NOT NULL,
  a_fencer_id INTEGER,
  b_fencer_id INTEGER,
  a_score INTEGER DEFAULT 0,
  b_score INTEGER DEFAULT 0,
  finished INTEGER DEFAULT 0,
  winner_next_id INTEGER,
  winner_next_slot TEXT,
  loser_next_id INTEGER,
  loser_next_slot TEXT,
  FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_division_fencers_division ON division_fencers(division_id);
CREATE INDEX IF NOT EXISTS idx_de_matches_division ON de_matches(division_id);
CREATE INDEX IF NOT EXISTS idx_de_matches_next ON de_matches(winner_next_id, loser_next_id);
