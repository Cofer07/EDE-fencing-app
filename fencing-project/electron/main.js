// electron/main.js
'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDb } = require('./db');

// define the helper
function safeRequire(label, mod) {
  try { require(mod); console.log(`[main] loaded ${label}`); }
  catch (e) { console.error(`[main] FAILED loading ${label}:`, e); throw e; }
}

// use it (note the capitalization matches)
safeRequire('ipc-fencers', './ipc-fencers');
safeRequire('ipc-import', './ipc-import');
safeRequire('ipc-settings', './ipc-settings');
safeRequire('ipc-swiss', './ipc-swiss');
require('./ipc-divisions');


// ...the rest of your file unchanged

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#0f1220',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (devUrl) {
    await win.loadURL(devUrl);            // ✅ loadURL for dev
  } else {
    await win.loadFile(path.join(process.cwd(), 'dist', 'index.html')); // ✅ loadFile for prod
  }
}

app.whenReady().then(() => {
  initDb();
  ipcMain.handle('app:ping', () => 'pong');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
