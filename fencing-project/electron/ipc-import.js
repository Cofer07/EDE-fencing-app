'use strict';
const { ipcMain, BrowserWindow } = require('electron');
const { db } = require('./db');

ipcMain.handle('fencers:import', (_e, { fencers = [] } = {}) => {
  if (!Array.isArray(fencers) || fencers.length === 0) {
    return { success: false, error: 'No fencers provided' };
  }

  // INSERT OR IGNORE relies on the unique index
  const insert = db.prepare(`
    INSERT OR IGNORE INTO fencers (name, club, weapon, is_valid)
    VALUES (?, ?, ?, 1)
  `);

  let inserted = 0;
  let ignored = 0;

  const tx = db.transaction((rows) => {
    for (const f of rows) {
      const res = insert.run(String(f.name || '').trim(), f.club || '', f.weapon || '');
      if (res.changes === 1) inserted += 1;
      else ignored += 1; // duplicate
    }
  });

  try {
    tx(fencers);
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('app:progress-updated'));
    return { success: true, inserted, ignored, total: fencers.length };
  } catch (err) {
    console.error('Import failed:', err);
    return { success: false, error: String(err?.message || err) };
  }
});
