'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload for the host window. Exposes a minimal, explicit bridge to the
 * renderer. Add-ons never touch this directly — they go through the
 * automation API, which is plain DOM/webview code running in the renderer.
 */
contextBridge.exposeInMainWorld('host', {
  getVersion: () => ipcRenderer.invoke('app:version')
});
