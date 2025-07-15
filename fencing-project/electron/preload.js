const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  importFencers: (fencers) => ipcRenderer.invoke('import-fencers', fencers),
});
