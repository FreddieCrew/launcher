import { contextBridge, ipcRenderer } from 'electron'

const api = {
  platform: process.platform,

  window: {
    minimize: () => ipcRenderer.invoke('win-control', 'min'),
    maximize: () => ipcRenderer.invoke('win-control', 'max'),
    close: () => ipcRenderer.invoke('win-control', 'close')
  },
  server: {
    queryInfo: (ip: string, port: number) => ipcRenderer.invoke('core-query-server', { ip, port }),
    queryPlayers: (ip: string, port: number) =>
      ipcRenderer.invoke('core-query-players', { ip, port }),
    queryRules: (ip: string, port: number) => ipcRenderer.invoke('core-query-rules', { ip, port }),
    launch: (config: any) => ipcRenderer.invoke('core-launch', config)
  },
  config: {
    read: () => ipcRenderer.invoke('config-read'),
    write: (data: any) => ipcRenderer.invoke('config-write', data),
    selectPath: (type: any) => ipcRenderer.invoke('dialog-select-path', type)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
  // @ts-ignore (define in dts)
  window.api = api
}
