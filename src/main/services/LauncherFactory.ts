import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { app } from 'electron';
import { NativeInjector } from './NativeInjector';

function getResourcesPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'resources')
    : path.join(__dirname, '../../resources');
}

export interface LauncherConfig {
  ip: string; port: number; username: string; password?: string;
  gtaPath: string; launcherPath?: string; winePrefix?: string; wineBinary?: string;
}

export interface ILauncher {
  launch(config: LauncherConfig): Promise<{ success: boolean; msg?: string }>;
}

class WindowsLauncher implements ILauncher {
  async launch(config: LauncherConfig) {
    const gtaExe = path.join(config.gtaPath, 'gta_sa.exe');
    if (!fs.existsSync(gtaExe)) return { success: false, msg: 'gta_sa.exe not found' };

    const resourcesPath = getResourcesPath();
    const myInjector = path.join(resourcesPath, 'bin/simple-injector.exe');
    const dllDir = path.join(resourcesPath, 'dlls');
    const sampDll = path.join(dllDir, 'samp.dll');
    const ompDll = path.join(dllDir, 'omp-client.dll');

    if (!fs.existsSync(myInjector)) return { success: false, msg: 'Injector not found' };

    const gameArgs = ['-c', '-n', config.username, '-h', config.ip, '-p', config.port.toString()];
    if (config.password) gameArgs.push('-z', config.password);

    const args = [
        path.join(config.gtaPath, 'gta_sa.exe'),
        "2",
        sampDll,
        ompDll,
        ...gameArgs
    ];

    try {
      const child = spawn(myInjector, args, { 
        cwd: config.gtaPath, 
        detached: true,
        stdio: 'ignore' 
      });

      child.unref();
      return { success: true };
    } catch (e: any) {
      return { success: false, msg: e.message };
    }
  }
}

class LinuxWineLauncher implements ILauncher {
  async launch(config: LauncherConfig): Promise<{ success: boolean; msg?: string }> {
    const { ip, port, username, password, gtaPath, wineBinary } = config;
    let { winePrefix } = config;

    if (!winePrefix || winePrefix.trim() === '') {
      if (gtaPath.includes('/drive_c/')) {
        winePrefix = gtaPath.split('/drive_c/')[0];
      } else {
        winePrefix = path.join(os.homedir(), '.wine');
      }
    }

    const wineBin = wineBinary || 'wine';
    const toWinePath = (p: string) => `Z:${path.resolve(p).replace(/\//g, '\\')}`;

    const resourcesPath = getResourcesPath();
    const myInjector = path.join(resourcesPath, 'bin/simple-injector.exe');
    const dllDir = path.join(resourcesPath, 'dlls');
    const sampDll = path.join(dllDir, 'samp.dll');
    const ompDll = path.join(dllDir, 'omp-client.dll');

    if (!fs.existsSync(myInjector)) return { success: false, msg: `Injector missing at: ${myInjector}` };
    if (!fs.existsSync(ompDll)) return { success: false, msg: `DLL missing at: ${ompDll}` };

    const env = {
      ...process.env,
      WINEPREFIX: winePrefix,
      LC_ALL: "C",
      WINEDLLOVERRIDES: "dinput8,samp,omp-client=n,b"
    };

    try {
      const reg = (args: string[]) => spawnSync(wineBin, ['reg', 'add', ...args, '/f'], { env, stdio: 'ignore' });
      reg(['HKCU\\Software\\Wine\\Fonts\\Replacements', '/v', 'Arial', '/d', 'Liberation Sans']);
      reg(['HKCU\\Software\\Wine\\Fonts\\Replacements', '/v', 'Verdana', '/d', 'Liberation Sans']);
      reg(['HKCU\\Software\\SAMP', '/v', 'PlayerName', '/d', username]);
      reg(['HKCU\\Software\\SAMP', '/v', 'gta_sa_exe', '/d', `${toWinePath(gtaPath)}\\gta_sa.exe`]);
    } catch (e) {
      console.error("Reg inject failed", e);
    }

    const gameArgs = ['-c', '-n', username, '-h', ip, '-p', port.toString()];
    if (password) gameArgs.push('-z', password);

    const wineArgs = [
      toWinePath(myInjector),
      toWinePath(path.join(gtaPath, 'gta_sa.exe')),
      "2",
      toWinePath(sampDll),
      toWinePath(ompDll),
      ...gameArgs
    ];

    try {
      const child = spawn(wineBin, wineArgs, {
        cwd: gtaPath,
        env,
        detached: true,
        stdio: 'ignore'
      });

      child.unref();
      return { success: true };
    } catch (e: any) {
      return { success: false, msg: `Wine launch failed: ${e.message}` };
    }
  }
}

export class LauncherFactory {
  static getLauncher(platform: string): ILauncher {
    return platform === 'win32' ? new WindowsLauncher() : new LinuxWineLauncher();
  }
}