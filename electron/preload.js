const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  platform: process.platform,
});

contextBridge.exposeInMainWorld('api', {
  baseURL: 'http://localhost:3001/api',
});
