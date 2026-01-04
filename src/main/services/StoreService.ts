import { app, dialog, BrowserWindow } from 'electron'
import path from 'node:path'
import fs from 'fs-extra'

const CONFIG_PATH = path.join(app.getPath('userData'), 'settings.json')

export class StoreService {
  static async read() {
    try {
      return await fs.readJson(CONFIG_PATH)
    } catch {
      return {}
    }
  }

  static async write(data: any) {
    await fs.writeJson(CONFIG_PATH, data)
  }

  static async selectPath(win: BrowserWindow | null, type: 'file' | 'directory') {
    const res = await dialog.showOpenDialog(win!, {
      properties: type === 'file' ? ['openFile'] : ['openDirectory']
    })
    return res.canceled ? null : res.filePaths[0]
  }
}
