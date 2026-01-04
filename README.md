# Open.mp Launcher

A cross-platform server browser and launcher for open.mp / SA-MP. 
Built primarily for **Linux** (via Wine). It should work on Windows too, I hope.

## Why?

The official open.mp launcher does not officially support Linux. This one handles the Wine prefixes, DLL overrides, and registry keys automatically.

## Architecture

This isn't just a wrapper *anymore*. It includes:

*   **Custom C++ Injector**: A native `simple-injector.exe` compiled from source that handles the DLL injection process (loads `samp.dll` and `omp-client.dll` in a suspended state). So we don't depend on the omp-launcher to handle the injection.
*   **Zero-Dependency Networking**: Custom UDP implementation of the SA-MP query protocol (i/c/r opcodes).
*   **Asset Management**: Automatically hash-checks and downloads correct SA-MP versions (0.3.7-R5, DL, etc.) and assets (`sampgui.png`, fonts).
*   **Wine Automation**: Automatically detects your Wine prefix, sets `WINEDLLOVERRIDES`, and handles the registry for `PlayerName`.

## Prerequisites

If you are on Linux and want to build this, you need the cross-compiler for the injector.

### Linux (Debian/Ubuntu)
```bash
sudo apt install wine mingw-w64
```

### Windows
You need MinGW or MSVC. But if you're on Windows just run the build command, it handles itself.

## Development

I use `pnpm`.

```bash
# Install dependencies
pnpm install

# Build the C++ injector and fetch assets
pnpm run prepare-build

# Run in dev mode
pnpm run dev
```

## Building

```bash
# Build for Linux (AppImage, deb, pacman)
pnpm run build:linux

# Build for Windows (NSIS)
pnpm run build:win
```

## How the Injector Works

The launcher compiles `injector/injector.cpp` using `i686-w64-mingw32-g++` (on Linux) or `g++` (on Windows). 

When you click play:
1. It validates the `gta_sa.exe` version.
2. It ensures the correct `samp.dll` hash.
3. It spawns the injector, which creates the GTA process in `CREATE_SUSPENDED` mode.
4. It injects the DLLs via `VirtualAllocEx` / `CreateRemoteThread`.
5. It resumes the thread.

PRs and issues are appreciated.
