'use strict';
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDb } = require('./db');
require('./ipc-fencers');
require('./ipc-import');

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
    await win.loadURL(devUrl);
  } else {
    await win.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
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
