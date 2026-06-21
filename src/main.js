'use strict';

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

/**
 * Main process.
 *
 * Creates the host window that renders the browser "chrome" (address bar,
 * add-on sidebar, log panel). The actual site the user connects to lives
 * inside a <webview> guest in the renderer. Add-ons drive that guest through
 * an injected automation API (see src/renderer/automation.js).
 */

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e2e',
    title: 'Webview',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Required so the renderer can use the <webview> tag to embed sites.
      webviewTag: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Some sites refuse to render inside an embedded frame via X-Frame-Options or
// frame-ancestors CSP. Because we use a real <webview> (a separate top-level
// frame, not an iframe) most sites load fine, but we still strip these headers
// defensively so "connect to any website" holds for the widest range of sites.
function relaxFramingHeaders() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    for (const key of Object.keys(headers)) {
      const lower = key.toLowerCase();
      if (lower === 'x-frame-options') {
        delete headers[key];
      }
      if (lower === 'content-security-policy') {
        // Remove only the frame-ancestors directive; keep the rest intact.
        headers[key] = headers[key].map((value) =>
          value
            .split(';')
            .filter((d) => !d.trim().toLowerCase().startsWith('frame-ancestors'))
            .join(';')
        );
      }
    }
    callback({ responseHeaders: headers });
  });
}

app.whenReady().then(() => {
  relaxFramingHeaders();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Lightweight ping so the renderer can confirm the bridge is wired up.
ipcMain.handle('app:version', () => app.getVersion());
