import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'fs-extra'
import os from 'node:os'
import { app } from 'electron'
import { VersionManager } from './VersionManager'

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../../resources')
}

export interface LauncherConfig {
  ip: string
  port: number
  username: string
  password?: string
  gtaPath: string
  winePrefix?: string
  wineBinary?: string
  launcherPath?: string
  preferredVersion?: string
}

export interface ILauncher {
  launch(config: LauncherConfig): Promise<{ success: boolean; msg?: string }>
}

function getWinePath(linuxPath: string, winePrefix: string): string {
  const absPath = path.resolve(linuxPath)
  const driveC = path.join(winePrefix, 'drive_c')
  if (absPath.startsWith(driveC)) {
    const rel = path.relative(driveC, absPath)
    return `C:\\${rel.replace(/\//g, '\\')}`
  }
  return `Z:${absPath.replace(/\//g, '\\')}`
}

async function installGameAssets(gtaPath: string) {
  const resourcesPath = getResourcesPath()
  const assetsSource = path.join(resourcesPath, 'game_assets')
  if (!fs.existsSync(assetsSource)) return
  try {
    await fs.copy(assetsSource, gtaPath, { overwrite: true, errorOnExist: false })
  } catch (e) {
    console.error('Failed to install game assets', e)
  }
}

async function checkGtaVersion(exePath: string) {
  try {
    const stats = await fs.stat(exePath)
    const size = stats.size
    const isV1 = (size > 14000000 && size < 14500000) || (size > 5000000 && size < 5500000)
    if (!isV1) console.warn(`[Launcher] Warning: gta_sa.exe size ${size} looks incompatible.`)
  } catch (e) {}
}

class WindowsLauncher implements ILauncher {
  async launch(config: LauncherConfig) {
    const gtaExe = path.join(config.gtaPath, 'gta_sa.exe')
    if (!fs.existsSync(gtaExe)) return { success: false, msg: 'gta_sa.exe not found.' }

    await checkGtaVersion(gtaExe)
    await installGameAssets(config.gtaPath)

    const versionId = config.preferredVersion || '0.3.7-R5'
    let sampDllPath = ''
    try {
      sampDllPath = await VersionManager.ensureVersion(versionId)
    } catch (e: any) {
      return { success: false, msg: e.message }
    }

    const resourcesPath = getResourcesPath()
    const myInjector = path.join(resourcesPath, 'bin/simple-injector.exe')
    const dllDir = path.join(resourcesPath, 'dlls')
    const ompDllSource = path.join(dllDir, 'omp-client.dll')

    const localSampDll = path.join(config.gtaPath, 'samp.dll')
    const localOmpDll = path.join(config.gtaPath, 'omp-client.dll')

    await fs.copy(sampDllPath, localSampDll, { overwrite: true })

    if (fs.existsSync(ompDllSource)) {
      await fs.copy(ompDllSource, localOmpDll, { overwrite: true })
    }

    if (!fs.existsSync(myInjector)) return { success: false, msg: 'Injector missing.' }

    const gameArgs = ['-c', '-n', config.username, '-h', config.ip, '-p', config.port.toString()]
    if (config.password) gameArgs.push('-z', config.password)

    const args = [gtaExe, '2', 'samp.dll', 'omp-client.dll', ...gameArgs]

    try {
      const child = spawn(myInjector, args, {
        cwd: config.gtaPath,
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      return { success: true }
    } catch (e: any) {
      return { success: false, msg: e.message }
    }
  }
}

class LinuxWineLauncher implements ILauncher {
  async launch(config: LauncherConfig): Promise<{ success: boolean; msg?: string }> {
    const { ip, port, username, password, gtaPath, wineBinary } = config
    let { winePrefix } = config

    if (!winePrefix || winePrefix.trim() === '') {
      if (gtaPath.includes('/drive_c/')) winePrefix = gtaPath.split('/drive_c/')[0]
      else winePrefix = path.join(os.homedir(), '.wine')
    }

    const wineBin = wineBinary || 'wine'
    const gtaExePath = path.join(gtaPath, 'gta_sa.exe')

    await checkGtaVersion(gtaExePath)
    await installGameAssets(gtaPath)

    const versionId = config.preferredVersion || '0.3.7-R5'
    let sampDllPath = ''
    try {
      sampDllPath = await VersionManager.ensureVersion(versionId)
    } catch (e: any) {
      return { success: false, msg: e.message }
    }

    const resourcesPath = getResourcesPath()
    const myInjector = path.join(resourcesPath, 'bin/simple-injector.exe')
    const dllDir = path.join(resourcesPath, 'dlls')
    const ompDllSource = path.join(dllDir, 'omp-client.dll')
    const localSampDll = path.join(gtaPath, 'samp.dll')
    const localOmpDll = path.join(gtaPath, 'omp-client.dll')

    await fs.copy(sampDllPath, localSampDll, { overwrite: true })
    if (fs.existsSync(ompDllSource)) {
      await fs.copy(ompDllSource, localOmpDll, { overwrite: true })
    }

    if (!fs.existsSync(myInjector)) return { success: false, msg: `Injector missing` }

    const env = {
      ...process.env,
      WINEPREFIX: winePrefix,
      LC_ALL: 'C',
      WINEDLLOVERRIDES: 'dinput8,samp,omp-client=n,b'
    }

    const wineGtaExe = getWinePath(gtaExePath, winePrefix)
    const wineInjector = getWinePath(myInjector, winePrefix)
    const wineSampDll = getWinePath(localSampDll, winePrefix)
    const wineOmpDll = getWinePath(localOmpDll, winePrefix)

    const runReg = (args: string[]) => {
      return new Promise<void>((resolve) => {
        try {
          const child = spawn(wineBin, ['reg', 'add', ...args, '/f'], { env, stdio: 'ignore' })
          child.on('exit', () => resolve())
          child.on('error', () => resolve())
        } catch (e) {
          resolve()
        }
      })
    }

    try {
      await runReg(['HKCU\\Software\\SAMP', '/v', 'PlayerName', '/d', username])
      await runReg(['HKCU\\Software\\SAMP', '/v', 'gta_sa_exe', '/d', wineGtaExe])
    } catch (e) {}

    const gameArgs = ['-c', '-n', username, '-h', ip, '-p', port.toString()]
    if (password) gameArgs.push('-z', password)
    const injectorArgs = [wineGtaExe, '2', wineSampDll, wineOmpDll, ...gameArgs]

    try {
      const child = spawn(wineBin, [wineInjector, ...injectorArgs], {
        cwd: gtaPath,
        env,
        detached: true,
        stdio: 'ignore'
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (child.exitCode !== null && child.exitCode !== 0) {
        return { success: false, msg: `Injector exited early with code ${child.exitCode}` }
      }

      child.unref()
      return { success: true }
    } catch (e: any) {
      return { success: false, msg: `Wine launch failed: ${e.message}` }
    }
  }
}

export class LauncherFactory {
  static getLauncher(platform: string): ILauncher {
    return platform === 'win32' ? new WindowsLauncher() : new LinuxWineLauncher()
  }
}
