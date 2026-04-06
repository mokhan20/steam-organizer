const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { STEAM_API_KEY, STEAM_ID } = require('./config')

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  win.loadFile('renderer/index.html')
}

ipcMain.handle('get-owned-games', async () => {
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=true&include_played_free_games=true&format=json`
  const response = await fetch(url)
  const data = await response.json()
  return data.response.games
})

app.whenReady().then(createWindow)