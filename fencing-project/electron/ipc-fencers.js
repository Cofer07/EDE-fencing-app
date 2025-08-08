'use strict';
const { ipcMain } = require('electron');
const { db } = require('./db');

ipcMain.handle('fencers:list', (_e, { search = '' } = {}) => {
  const like = `%${String(search).trim()}%`;
  return db
    .prepare(
      `SELECT id, name, club, weapon, is_valid
       FROM fencers
       WHERE name LIKE ? OR IFNULL(club,'') LIKE ? OR IFNULL(weapon,'') LIKE ?
       ORDER BY name COLLATE NOCASE`
    )
    .all(like, like, like);
});

ipcMain.handle('fencers:updateValidity', (_e, { ids = [], isValid = true } = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) return { updated: 0 };
  const v = isValid ? 1 : 0;
  const stmt = db.prepare(`UPDATE fencers SET is_valid = ? WHERE id = ?`);
  const tx = db.transaction(arr => arr.forEach(id => stmt.run(v, id)));
  tx(ids);
  return { updated: ids.length, value: v };
});
