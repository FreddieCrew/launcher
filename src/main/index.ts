import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icons/icon.png?asset'
import log from 'electron-log'
import { QueryService } from './services/QueryService'
import { LauncherFactory } from './services/LauncherFactory'
import { StoreService } from './services/StoreService'

Object.assign(console, log.functions)

app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    show: true,
    backgroundColor: '#0e0e10',
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.png'),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true
    }
  })

  if (process.platform === 'win32') {
    mainWindow.setIcon(icon)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.omp-launcher')

    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    try { QueryService.getInstance().start() } catch (e) { console.error(e) }

    createWindow()

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

ipcMain.handle('win-control', (_, action) => {
  if (!mainWindow) return
  if (action === 'min') mainWindow.minimize()
  if (action === 'max') mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  if (action === 'close') mainWindow.close()
})

ipcMain.handle('core-query-server', (_, d) => QueryService.getInstance().query(d.ip, d.port, 'i'))
ipcMain.handle('core-query-players', (_, d) => QueryService.getInstance().query(d.ip, d.port, 'c'))
ipcMain.handle('core-query-rules', (_, d) => QueryService.getInstance().query(d.ip, d.port, 'r'))
ipcMain.handle('core-launch', (_, cfg) => LauncherFactory.getLauncher(process.platform).launch(cfg))
ipcMain.handle('config-read', () => StoreService.read())
ipcMain.handle('config-write', (_, d) => StoreService.write(d))
ipcMain.handle('dialog-select-path', (_, t) => StoreService.selectPath(mainWindow, t))