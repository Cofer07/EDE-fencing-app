'use strict';
const { ipcMain, dialog, app } = require('electron');
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function readSettings() {
  try { return JSON.parse(fs.readFileSync(settingsPath, 'utf8')); }
  catch { return {}; }
}
function writeSettings(obj) {
  fs.writeFileSync(settingsPath, JSON.stringify(obj, null, 2));
}

ipcMain.handle('settings:get', (_e, key) => {
  const s = readSettings();
  return key ? s[key] : s;
});

ipcMain.handle('settings:set', (_e, { key, value }) => {
  const s = readSettings();
  s[key] = value;
  writeSettings(s);
  return { ok: true };
});

// Optional: OS file picker (returns full path)
ipcMain.handle('files:pickCsv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select CSV',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths?.[0]) return { canceled: true };
  const filePath = filePaths[0];
  const s = readSettings();
  s.lastCsvPath = filePath;
  writeSettings(s);
  return { canceled: false, filePath };
});
