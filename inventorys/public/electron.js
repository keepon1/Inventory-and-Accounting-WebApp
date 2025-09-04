const { app, BrowserWindow } = require('electron');

async function createWindow() {
  const isDev = (await import('electron-is-dev')).default; // Use dynamic import

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${__dirname}/../build/index.html`;

  win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
