'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('app:ping'),

  // roster
  listFencers: (search) => ipcRenderer.invoke('fencers:list', { search }),
  updateFencerValidity: (ids, isValid) => ipcRenderer.invoke('fencers:updateValidity', { ids, isValid }),
  importFencers: (fencers) => ipcRenderer.invoke('fencers:import', { fencers }),
  clearFencers: () => ipcRenderer.invoke('fencers:clear'),
  fencerStats: () => ipcRenderer.invoke('fencers:stats'),

  // settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),

  // swiss core
  swissStart: (totalRounds) => ipcRenderer.invoke('swiss:start', { totalRounds }),
  swissState: () => ipcRenderer.invoke('swiss:state'),
  swissReport: (matchId, scoreA, scoreB) => ipcRenderer.invoke('swiss:report', { matchId, scoreA, scoreB }),
  swissNextRound: () => ipcRenderer.invoke('swiss:nextRound'),

  // swiss maintenance & debug
  swissReset: () => ipcRenderer.invoke('swiss:reset'),
  fullReset: () => ipcRenderer.invoke('app:fullReset'),
  swissDebugCounts: () => ipcRenderer.invoke('swiss:debugCounts'),

  // Divisions
  divisionsCreate: () => ipcRenderer.invoke('divisions:create'),
  divisionsList: () => ipcRenderer.invoke('divisions:list'),
  divisionState: (divisionId) => ipcRenderer.invoke('division:state', { divisionId }),
  divisionReport: (matchId, aScore, bScore) => ipcRenderer.invoke('division:report', { matchId, aScore, bScore }),
  divisionsDebug: () => ipcRenderer.invoke('divisions:debug'),
});
