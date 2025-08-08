'use strict';
const { ipcMain } = require('electron');
const { db } = require('./db');

// payload: { fencers: Array<{name:string, club?:string, weapon?:string}> }
ipcMain.handle('fencers:import', (_e, { fencers = [] } = {}) => {
  if (!Array.isArray(fencers) || fencers.length === 0) {
    return { success: false, error: 'No fencers provided' };
  }

  const insert = db.prepare(`
    INSERT INTO fencers (name, club, weapon, is_valid)
    VALUES (?, ?, ?, 1)
  `);

  const tx = db.transaction((rows) => {
    for (const f of rows) {
      insert.run(String(f.name || '').trim(), f.club || '', f.weapon || '');
    }
  });

  try {
    tx(fencers);
    return { success: true, count: fencers.length };
  } catch (err) {
    console.error('Import failed:', err);
    return { success: false, error: String(err?.message || err) };
  }
});
