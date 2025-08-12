// electron/db/index.js
'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const userData = app?.getPath?.('userData') || process.cwd();
const dbPath = path.join(userData, 'fencing.db');
const db = new Database(dbPath);

// ✅ make cascades work (needed for deleting fencers/divisions cleanly)
db.pragma('foreign_keys = ON');

function ensureMigrations() {
  // track which migrations ran
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY)`);

  const applied = new Set(
    db.prepare(`SELECT id FROM schema_migrations`).all().map(r => r.id)
  );

  const migDir = path.join(process.cwd(), 'electron', 'db', 'migrations');
  if (!fs.existsSync(migDir)) return;

  const files = fs.readdirSync(migDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // run in order: 001_, 002_, ...

  const mark = db.prepare(`INSERT INTO schema_migrations (id) VALUES (?)`);

  // Run each migration in its own transaction
  const run = db.transaction((id, sql) => {
    db.exec(sql);     // migration files must NOT contain BEGIN/COMMIT
    mark.run(id);
  });

  for (const f of files) {
    const id = f.replace('.sql', '');
    if (applied.has(id)) continue;
    const sql = fs.readFileSync(path.join(migDir, f), 'utf8');
    run(id, sql);
  }
}

function initDb() {
  ensureMigrations();
}

module.exports = { db, initDb, dbPath };
