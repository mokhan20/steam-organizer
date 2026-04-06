const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('steamAPI', {
  getOwnedGames: () => ipcRenderer.invoke('get-owned-games')
})