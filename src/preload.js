const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mirror', {
  start: (opts) => ipcRenderer.invoke('start', opts),
  stop: () => ipcRenderer.invoke('stop'),
  onLog: (cb) => ipcRenderer.on('log', (_e, t) => cb(t)),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s))
});
