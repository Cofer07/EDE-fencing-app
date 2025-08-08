'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // sanity
  ping: () => ipcRenderer.invoke('app:ping'),

  // fencers
  listFencers: (search) => ipcRenderer.invoke('fencers:list', { search }),
  updateFencerValidity: (ids, isValid) =>
    ipcRenderer.invoke('fencers:updateValidity', { ids, isValid }),
  importFencers: (fencers) => ipcRenderer.invoke('fencers:import', { fencers }),
  clearFencers: () => ipcRenderer.invoke('fencers:clear'),
  fencerStats: () => ipcRenderer.invoke('fencers:stats'),

  // settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),

  // optional OS file picker
  pickCsv: () => ipcRenderer.invoke('files:pickCsv'),
});
