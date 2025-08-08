'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('app:ping'),
  listFencers: (search) => ipcRenderer.invoke('fencers:list', { search }),
  updateFencerValidity: (ids, isValid) =>
    ipcRenderer.invoke('fencers:updateValidity', { ids, isValid }),
  importFencers: (fencers) => ipcRenderer.invoke('fencers:import', { fencers }),
});
