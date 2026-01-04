import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import { app } from 'electron';
import sevenBin from '7zip-bin';
import Seven from 'node-7z';
const { extractFull } = Seven;
import { ASSET_URL, SAMP_VERSIONS } from '../../shared/versions';
import log from 'electron-log';

const USER_DATA = app.getPath('userData');
const VERSIONS_DIR = path.join(USER_DATA, 'versions');
const CACHE_DIR = path.join(USER_DATA, 'cache');
const ARCHIVE_PATH = path.join(CACHE_DIR, 'samp_clients.7z');

async function getFileHash(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash('md5').update(buffer).digest('hex');
}

async function findFile(dir: string, filename: string): Promise<string | null> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const found = await findFile(fullPath, filename);
            if (found) return found;
        } else if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
            return fullPath;
        }
    }
    return null;
}

export class VersionManager {

    static async ensureVersion(versionId: string): Promise<string> {
        const version = SAMP_VERSIONS.find(v => v.id === versionId) || SAMP_VERSIONS[0];
        const versionDir = path.join(VERSIONS_DIR, version.id);
        const targetDll = path.join(versionDir, 'samp.dll');
        if (fs.existsSync(targetDll)) {
            const currentHash = await getFileHash(targetDll);
            if (currentHash === version.checksum) {
                return targetDll;
            }
            log.warn(`[VersionManager] Hash mismatch for ${versionId}. Re-installing...`);
            await fs.remove(versionDir);
        }

        log.info(`[VersionManager] Preparing ${versionId}...`);

        if (!fs.existsSync(ARCHIVE_PATH)) {
            await this.downloadArchive();
        } else {
            const stats = await fs.stat(ARCHIVE_PATH);
            if (stats.size < 1000000) {
                log.warn('[VersionManager] Archive corrupt. Re-downloading...');
                await fs.remove(ARCHIVE_PATH);
                await this.downloadArchive();
            }
        }
        await this.extractVersionSafe(version, versionDir);

        if (!fs.existsSync(targetDll)) {
            throw new Error(`Extraction failed. Could not find samp.dll for ${versionId}`);
        }

        const finalHash = await getFileHash(targetDll);
        if (finalHash !== version.checksum) {
            await fs.remove(targetDll);
            throw new Error(`Integrity Check Failed. Checksum mismatch for ${versionId}.`);
        }

        return targetDll;
    }

    private static async downloadArchive() {
        await fs.ensureDir(CACHE_DIR);
        log.info(`[VersionManager] Downloading assets from ${ASSET_URL}`);

        const writer = fs.createWriteStream(ARCHIVE_PATH);
        const response = await axios({
            url: ASSET_URL,
            method: 'GET',
            responseType: 'stream'
        });

        response.data.pipe(writer);

        return new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    }

    private static async extractVersionSafe(version: any, outputDir: string) {
        const tempExtractDir = path.join(CACHE_DIR, `temp_${Date.now()}_${version.id}`);
        await fs.ensureDir(tempExtractDir);
        await fs.ensureDir(outputDir);

        log.info(`[VersionManager] Extracting ${version.name}...`);

        const pathTo7za = sevenBin.path7za || (sevenBin as any).default?.path7za;
        const internalPath = version.archivePath.replace(/\\/g, '/');
        const wildcard = internalPath.endsWith('/') ? `${internalPath}*` : `${internalPath}/*`;

        return new Promise<void>((resolve, reject) => {
            const stream = extractFull(ARCHIVE_PATH, tempExtractDir, {
                $bin: pathTo7za,
                recursive: true,
                wildcards: [wildcard]
            });

            stream.on('end', async () => {
                try {
                    const foundDllPath = await findFile(tempExtractDir, 'samp.dll');

                    if (foundDllPath) {
                        const destPath = path.join(outputDir, 'samp.dll');
                        if (foundDllPath !== destPath) {
                            await fs.move(foundDllPath, destPath, { overwrite: true });
                        }
                        await fs.remove(tempExtractDir);
                        resolve();
                    } else {
                        reject(new Error(`samp.dll not found in extracted path: ${version.archivePath}`));
                    }
                } catch (e) {
                    await fs.remove(tempExtractDir).catch(() => { });
                    reject(e);
                }
            });

            stream.on('error', async (err: any) => {
                log.error('[VersionManager] 7z Error:', err);
                await fs.remove(tempExtractDir).catch(() => { });
                reject(err);
            });
        });
    }
}