import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import sevenBin from '7zip-bin';
import Seven from 'node-7z';

const { extractFull } = Seven;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const resourcesDir = path.join(rootDir, 'resources');
const dllDir = path.join(resourcesDir, 'dlls');
const gameAssetsDir = path.join(resourcesDir, 'game_assets');
const tempDir = path.join(rootDir, 'temp_assets');
const SAMP_ASSET_URL = "https://assets.open.mp/samp_clients.7z";
const ARCHIVE_NAME = "samp_clients.7z";
const OMP_CLIENT_URL = "https://assets.open.mp/omp-client.dll";
const ASSET_MAP = [
    { name: "samp.dll", path: "0.3.7-R5/", dest: dllDir },
    { name: "bass.dll", path: "shared/", dest: gameAssetsDir },
    { name: "gtaweap3.ttf", path: "shared/", dest: gameAssetsDir },
    { name: "mouse.png", path: "shared/", dest: gameAssetsDir },
    { name: "samp.saa", path: "shared/", dest: gameAssetsDir },
    { name: "sampaux3.ttf", path: "shared/", dest: gameAssetsDir },
    { name: "sampgui.png", path: "shared/", dest: gameAssetsDir },
    { name: "blanktex.txd", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "CUSTOM.ide", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "custom.img", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "samaps.txd", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "SAMP.ide", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "SAMP.img", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "SAMP.ipl", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
    { name: "SAMPCOL.img", path: "shared/SAMP/", dest: path.join(gameAssetsDir, 'SAMP') },
];

async function downloadFile(url, dest) {
    console.log(`[Assets] Downloading: ${url}`);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'arraybuffer'
    });
    await fs.writeFile(dest, response.data);
}

async function findFile(dir, filename) {
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

function extract7z(archivePath, outputDir) {
    const pathTo7za = sevenBin.path7za || sevenBin.path7za_64 || (sevenBin.default ? sevenBin.default.path7za : '');

    return new Promise((resolve, reject) => {
        const stream = extractFull(archivePath, outputDir, {
            $bin: pathTo7za,
            recursive: true
        });
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
    });
}

async function main() {
    console.log('[Assets] Starting Asset Preparation...');

    await fs.ensureDir(dllDir);
    await fs.ensureDir(gameAssetsDir);
    await fs.ensureDir(tempDir);

    const archivePath = path.join(tempDir, ARCHIVE_NAME);
    if (!fs.existsSync(archivePath)) {
        await downloadFile(SAMP_ASSET_URL, archivePath);
    } else {
        console.log('[Assets] SA-MP Archive found in cache.');
    }

    console.log('[Assets] Extracting archive...');
    await extract7z(archivePath, tempDir);
    console.log('[Assets] Organizing files...');

    for (const item of ASSET_MAP) {
        const targetFile = path.join(item.dest, item.name);
        const expectedSourcePath = path.join(tempDir, item.path, item.name);

        let actualSource = null;
        if (await fs.pathExists(expectedSourcePath)) {
            actualSource = expectedSourcePath;
        } else {
            actualSource = await findFile(tempDir, item.name);
        }

        if (actualSource) {
            await fs.ensureDir(item.dest);
            await fs.copy(actualSource, targetFile, { overwrite: true });
            console.log(`Copied: ${item.name}`);
        } else {
            console.warn(`Warning: Could not find ${item.name} in extracted files`);
        }
    }

    const ompDest = path.join(dllDir, 'omp-client.dll');
    if (!fs.existsSync(ompDest)) {
        try {
            await downloadFile(OMP_CLIENT_URL, ompDest);
            console.log('Downloaded: omp-client.dll');
        } catch (e) {
            console.error('Failed to download omp-client.dll. Check internet connection');
        }
    } else {
        console.log('omp-client.dll already exists.');
    }

    console.log('[Assets] Cleaning up...');
    await fs.remove(tempDir);
    console.log('[Assets] Done.');
}

main().catch(e => {
    console.error('[Assets] Failed:', e);
    process.exit(1);
});