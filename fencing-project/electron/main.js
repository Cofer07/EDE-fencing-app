const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

// Initialize database
const db = new Database(path.join(__dirname, '../fencing.db'));

let win;

function createWindow() {
  if (win) return; // Prevent multiple windows

  win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL('http://localhost:5173'); // Assumes Vite dev server is running

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS, it's common for apps to stay open until the user quits explicitly
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // On macOS, re-create a window when dock icon is clicked and no other windows open
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handler to receive fencer data from renderer
ipcMain.handle('import-fencers', async (_event, fencers) => {
  try {
    const stmt = db.prepare('INSERT INTO fencers (name, club, weapon) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(row.name, row.club, row.weapon);
      }
    });

    insertMany(fencers);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
