'use strict';
const { ipcMain, BrowserWindow } = require('electron');
const { db } = require('./db');

// list
ipcMain.handle('fencers:list', (_e, { search = '' } = {}) => {
  const q = String(search || '').trim();
  if (!q) {
    return db.prepare(`SELECT id, name, club, weapon, is_valid FROM fencers ORDER BY name`).all();
  }
  const like = `%${q}%`;
  return db.prepare(`
    SELECT id, name, club, weapon, is_valid
    FROM fencers
    WHERE name LIKE ? OR ifnull(club,'') LIKE ? OR ifnull(weapon,'') LIKE ?
    ORDER BY name
  `).all(like, like, like);
});

// validity
ipcMain.handle('fencers:updateValidity', (_e, { ids = [], isValid = 1 } = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) return { success:false, error:'No ids' };
  const stmt = db.prepare(`UPDATE fencers SET is_valid=? WHERE id=?`);
  const tx = db.transaction((arr) => { for (const id of arr) stmt.run(isValid ? 1 : 0, id); });
  tx(ids);
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return { success:true, count: ids.length };
});

// clear roster
ipcMain.handle('fencers:clear', () => {
  const info = db.prepare(`DELETE FROM fencers`).run();
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
  return { success:true, deleted: info.changes };
});

// stats for stepper
ipcMain.handle('fencers:stats', () => {
  const row = db.prepare(`
    SELECT COUNT(*) AS count,
           SUM(CASE WHEN is_valid=1 THEN 1 ELSE 0 END) AS valid_count
    FROM fencers
  `).get();
  const count = row?.count || 0;
  const validCount = row?.valid_count || 0;

  const t = db.prepare(`SELECT id, total_rounds FROM swiss_tournaments ORDER BY id DESC LIMIT 1`).get();
  let swissStarted = false, swissComplete = false;
  if (t) {
    swissStarted = true;
    const lastRound = db.prepare(`SELECT COALESCE(MAX(round_number),0) AS r FROM swiss_rounds WHERE tournament_id=?`).get(t.id).r;
    const unfinished = db.prepare(`SELECT COUNT(*) AS c FROM swiss_matches WHERE tournament_id=? AND finished=0`).get(t.id).c;
    swissComplete = (lastRound >= t.total_rounds) && (unfinished === 0);
  }

  let divisionsHaveResults = false;
  try {
    const divRow = db.prepare(`
      SELECT
        SUM(CASE WHEN a_score IS NOT NULL OR b_score IS NOT NULL THEN 1 ELSE 0 END) AS scored_matches
      FROM de_matches
    `).get();
    divisionsHaveResults = (divRow?.scored_matches || 0) > 0;
  } catch (_) {
    divisionsHaveResults = false;
  }

  return {
    count,
    validCount,
    hasRoster: count > 0,
    validationComplete: count > 0, // basic for now
    swissStarted,
    swissComplete,
    divisionsComplete: divisionsHaveResults,
  };
});

// FULL reset (swiss + roster)
ipcMain.handle('app:fullReset', () => {
  try {
    const wipe = db.transaction(() => {
      db.prepare(`DELETE FROM swiss_matches`).run();
      db.prepare(`DELETE FROM swiss_rounds`).run();
      db.prepare(`DELETE FROM swiss_tournaments`).run();
      db.prepare(`DELETE FROM fencers`).run();
    });
    wipe();

    const hasSeq = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'
    `).get();
    if (hasSeq) {
      db.prepare(`
        DELETE FROM sqlite_sequence
        WHERE name IN ('swiss_matches','swiss_rounds','swiss_tournaments','fencers')
      `).run();
    }
    try { db.prepare(`VACUUM`).run(); } catch (_) {}

    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
    return { success:true };
  } catch (e) {
    console.error('app:fullReset failed', e);
    return { success:false, error:String(e?.message || e) };
  }
});
