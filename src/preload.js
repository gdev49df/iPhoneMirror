const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mirror', {
  start: (opts) => ipcRenderer.invoke('start', opts),
  usbList: () => ipcRenderer.invoke('usb:list'),
  usbEnable: (d) => ipcRenderer.invoke('usb:enable', d),
  usbDriver: () => ipcRenderer.invoke('usb:driver'),
  stop: () => ipcRenderer.invoke('stop'),
  onLog: (cb) => ipcRenderer.on('log', (_e, t) => cb(t)),
  onState: (cb) => ipcRenderer.on('state', (_e, s) => cb(s))
});
