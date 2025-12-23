import koffi from 'koffi';
import path from 'path';
import fs from 'fs';

let kernel32: any = null;
let OpenProcess: any = null;
let VirtualAllocEx: any = null;
let WriteProcessMemory: any = null;
let CreateRemoteThread: any = null;
let GetModuleHandleA: any = null;
let GetProcAddress: any = null;
let CloseHandle: any = null;
let WaitForSingleObject: any = null;
let CreateToolhelp32Snapshot: any = null;
let Module32First: any = null;
let Module32Next: any = null;
let MODULEENTRY32: any = null;

const HANDLE = 'HANDLE';
const LPVOID = 'LPVOID';
const DWORD = 'DWORD';
const BOOL = 'BOOL';
const size_t = 'size_t';
const PROCESS_ALL_ACCESS = 0x1F0FFF;
const MEM_COMMIT = 0x1000;
const MEM_RESERVE = 0x2000;
const PAGE_READWRITE = 0x04;
const TH32CS_SNAPMODULE = 0x00000008;
const TH32CS_SNAPMODULE32 = 0x00000010;
const INFINITE = 0xFFFFFFFF;

if (process.platform === 'win32') {
    try {
        kernel32 = koffi.load('kernel32.dll');

        const HANDLE_T = koffi.alias('HANDLE', 'void *');
        const LPVOID_T = koffi.alias('LPVOID', 'void *');
        const DWORD_T = koffi.alias('DWORD', 'unsigned long');
        const BOOL_T = koffi.alias('BOOL', 'int');
        const SIZE_T = koffi.alias('size_t', 'unsigned long long');

        MODULEENTRY32 = koffi.struct('MODULEENTRY32', {
            dwSize: 'uint32',
            th32ModuleID: 'uint32',
            th32ProcessID: 'uint32',
            GlblcntUsage: 'uint32',
            ProccntUsage: 'uint32',
            modBaseAddr: 'ptr',
            modBaseSize: 'uint32',
            hModule: HANDLE_T,
            szModule: koffi.array('char', 256),
            szExePath: koffi.array('char', 260)
        });

        OpenProcess = kernel32.func('__stdcall', 'OpenProcess', [PROCESS_ALL_ACCESS, BOOL, DWORD], HANDLE_T);
        VirtualAllocEx = kernel32.func('__stdcall', 'VirtualAllocEx', [HANDLE_T, LPVOID_T, SIZE_T, DWORD, DWORD], LPVOID_T);
        WriteProcessMemory = kernel32.func('__stdcall', 'WriteProcessMemory', [HANDLE_T, LPVOID_T, koffi.pointer('void', 'InputBuffer'), SIZE_T, koffi.out('size_t')], BOOL_T);
        CreateRemoteThread = kernel32.func('__stdcall', 'CreateRemoteThread', [HANDLE_T, LPVOID_T, SIZE_T, LPVOID_T, LPVOID_T, DWORD, LPVOID_T], HANDLE_T);
        GetModuleHandleA = kernel32.func('__stdcall', 'GetModuleHandleA', ['str'], HANDLE_T);
        GetProcAddress = kernel32.func('__stdcall', 'GetProcAddress', [HANDLE_T, 'str'], LPVOID_T);
        CloseHandle = kernel32.func('__stdcall', 'CloseHandle', [HANDLE_T], BOOL_T);
        WaitForSingleObject = kernel32.func('__stdcall', 'WaitForSingleObject', [HANDLE_T, DWORD], DWORD);
        CreateToolhelp32Snapshot = kernel32.func('__stdcall', 'CreateToolhelp32Snapshot', ['DWORD', 'DWORD'], HANDLE_T);
        Module32First = kernel32.func('__stdcall', 'Module32First', ['HANDLE', koffi.out('MODULEENTRY32')], 'BOOL');
        Module32Next = kernel32.func('__stdcall', 'Module32Next', ['HANDLE', koffi.out('MODULEENTRY32')], 'BOOL');

    } catch (e) {
        console.error('[NativeInjector] Failed to load kernel32.dll or define Win32 types', e);
    }
}

export class NativeInjector {

    static async waitForModule(pid: number, moduleNamePart: string, timeoutMs = 15000): Promise<boolean> {
        if (process.platform !== 'win32' || !CreateToolhelp32Snapshot) return false;

        const start = Date.now();
        const search = moduleNamePart.toLowerCase();

        while (Date.now() - start < timeoutMs) {
            const hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid);
            
            if (hSnapshot && hSnapshot !== null) {
                const entry: any = { dwSize: koffi.sizeof('MODULEENTRY32') };
                if (Module32First(hSnapshot, entry)) {
                    do {
                        const name = Buffer.from(entry.szModule).toString('utf8').replace(/\0/g, '').toLowerCase();
                        if (name.includes(search)) {
                            CloseHandle(hSnapshot);
                            return true;
                        }
                    } while (Module32Next(hSnapshot, entry));
                }
                CloseHandle(hSnapshot);
            }
            await new Promise(r => setTimeout(r, 100));
        }
        return false;
    }

    static injectDll(pid: number, dllPath: string) {
        if (process.platform !== 'win32' || !OpenProcess) return;
        if (!fs.existsSync(dllPath)) throw new Error(`DLL not found: ${dllPath}`);
        
        const absPath = path.resolve(dllPath);
        const hProcess = OpenProcess(PROCESS_ALL_ACCESS, 0, pid);
        
        if (!hProcess || hProcess.address.isNull()) throw new Error(`Failed to open process ${pid}`);

        try {
            // ANSI for LoadLibraryA
            const pathBuffer = Buffer.from(absPath + '\0', 'latin1');
            const pRemoteMem = VirtualAllocEx(hProcess, null, pathBuffer.length, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
            
            if (!pRemoteMem || pRemoteMem.address.isNull()) throw new Error('VirtualAllocEx failed');

            const bytesWritten = [0];
            const writeRes = WriteProcessMemory(hProcess, pRemoteMem, pathBuffer, pathBuffer.length, bytesWritten);
            if (!writeRes) throw new Error('WriteProcessMemory failed');

            const hKernel32 = GetModuleHandleA('kernel32.dll');
            const pLoadLibrary = GetProcAddress(hKernel32, 'LoadLibraryA');

            if (!pLoadLibrary || pLoadLibrary.address.isNull()) throw new Error('Failed to find LoadLibraryA');

            const hThread = CreateRemoteThread(hProcess, null, 0, pLoadLibrary, pRemoteMem, 0, null);
            if (!hThread || hThread.address.isNull()) throw new Error('CreateRemoteThread failed');

            WaitForSingleObject(hThread, INFINITE);
            CloseHandle(hThread);
        } finally {
            CloseHandle(hProcess);
        }
    }
}