const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

// Initialize database
const db = new Database(path.join(__dirname, '../fencing.db'));

let win;

function createWindow() {
  if (win) return;

  win = new BrowserWindow({
    show: false, // Wait until ready
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL('http://localhost:5173');

  win.once('ready-to-show', () => {
    win.maximize(); // Maximizes the window but keeps standard window chrome
    win.show();
  });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handler
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
