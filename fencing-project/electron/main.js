const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '../fencing.db'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
    },
  });

  win.loadURL('http://localhost:5173'); // if using Vite
}

app.whenReady().then(createWindow);

// Receive fencers from frontend and insert
ipcMain.handle('import-fencers', async (_event, fencers) => {
  const stmt = db.prepare('INSERT INTO fencers (name, club, weapon) VALUES (?, ?, ?)');
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      stmt.run(row.name, row.club, row.weapon);
    }
  });

  try {
    insertMany(fencers);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
