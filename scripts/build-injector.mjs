import { execSync } from 'node:child_process'
import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

const SOURCE_FILE = path.join(rootDir, 'injector', 'injector.cpp')
const OUTPUT_DIR = path.join(rootDir, 'resources', 'bin')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'simple-injector.exe')
const FLAGS = '-static -municode -std=c++17 -O2 -s -lstdc++fs'

function checkCompiler(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

async function build() {
  console.log('🔹 [Build] Starting Injector Compilation...')
  await fs.ensureDir(OUTPUT_DIR)

  let compiler = ''

  if (process.platform === 'linux') {
    if (checkCompiler('i686-w64-mingw32-g++')) {
      compiler = 'i686-w64-mingw32-g++'
    } else if (checkCompiler('x86_64-w64-mingw32-g++')) {
      console.warn('[Build] Warning: 32-bit compiler not found. Using 64-bit.')
      compiler = 'x86_64-w64-mingw32-g++'
    } else {
      console.error('[Build] Error: MinGW compiler not found.')
      console.error('Install: sudo apt install mingw-w64')
      process.exit(1)
    }
  } else if (process.platform === 'win32') {
    compiler = 'g++'
  } else {
    console.error(`[Build] Unsupported Build Platform: ${process.platform}`)
    process.exit(1)
  }
  const command = `${compiler} "${SOURCE_FILE}" -o "${OUTPUT_FILE}" ${FLAGS}`

  console.log(`Compiler: ${compiler}`)
  console.log(`Output:   ${path.relative(rootDir, OUTPUT_FILE)}`)

  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir })
    console.log('[Build] Injector compiled successfully!')
  } catch (error) {
    console.error('[Build] Compilation failed')
    process.exit(1)
  }
}

build()
