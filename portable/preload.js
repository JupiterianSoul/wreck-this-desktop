const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('webkit', { messageHandlers: { wtd: { postMessage: (m) => ipcRenderer.send('wtd', m) } } });
