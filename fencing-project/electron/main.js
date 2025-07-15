console.log("🟢 Electron process started");

const { app, BrowserWindow } = require('electron');

function createWindow() {
  console.log("🟢 Creating window...");

  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  win.loadURL('https://example.com')
    .then(() => {
      console.log("🟢 Page loaded");
    })
    .catch((err) => {
      console.error("❌ Failed to load URL:", err);
    });

  win.on('ready-to-show', () => {
    console.log("🟢 Window ready to show");
    win.show();
    win.focus();
  });
}

app.whenReady().then(() => {
  console.log("🟢 App is ready");
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
