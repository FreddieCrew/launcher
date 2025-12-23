#include <windows.h>
#include <tlhelp32.h>
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

using namespace std;

bool IsModuleLoaded(DWORD pid, const string& moduleName) {
    HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid);
    if (hSnap == INVALID_HANDLE_VALUE) return false;

    MODULEENTRY32 me;
    me.dwSize = sizeof(MODULEENTRY32);

    bool found = false;
    if (Module32First(hSnap, &me)) {
        do {
            string currentMod = me.szModule;
            transform(currentMod.begin(), currentMod.end(), currentMod.begin(), ::tolower);
            
            if (currentMod.find(moduleName) != string::npos) {
                found = true;
                break;
            }
        } while (Module32Next(hSnap, &me));
    }
    
    CloseHandle(hSnap);
    return found;
}

bool InjectDLL(DWORD pid, const string& dllPath) {
    HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    if (!hProcess) {
        cerr << "Failed to open process. Error: " << GetLastError() << endl;
        return false;
    }

    void* pRemoteMem = VirtualAllocEx(hProcess, NULL, dllPath.length() + 1, MEM_COMMIT, PAGE_READWRITE);
    if (!pRemoteMem) {
        cerr << "VirtualAllocEx failed. Error: " << GetLastError() << endl;
        CloseHandle(hProcess);
        return false;
    }

    if (!WriteProcessMemory(hProcess, pRemoteMem, dllPath.c_str(), dllPath.length() + 1, NULL)) {
        cerr << "WriteProcessMemory failed. Error: " << GetLastError() << endl;
        CloseHandle(hProcess);
        return false;
    }

    HMODULE hKernel32 = GetModuleHandle("kernel32.dll");
    LPVOID pLoadLibrary = (LPVOID)GetProcAddress(hKernel32, "LoadLibraryA");

    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)pLoadLibrary, pRemoteMem, 0, NULL);
    if (!hThread) {
        cerr << "CreateRemoteThread failed. Error: " << GetLastError() << endl;
        CloseHandle(hProcess);
        return false;
    }

    WaitForSingleObject(hThread, 5000);
    
    CloseHandle(hThread);
    CloseHandle(hProcess);
    return true;
}

int main(int argc, char* argv[]) {
    if (argc < 4) {
        cout << "Usage: injector.exe <gta_exe> <dll_count> <dll1> [dll2...] <args...>" << endl;
        return 1;
    }

    string gtaPath = argv[1];
    int dllCount = atoi(argv[2]);
    
    vector<string> dlls;
    for (int i = 0; i < dllCount; i++) {
        dlls.push_back(argv[3 + i]);
    }
    string cmdLine = "\"" + gtaPath + "\"";
    for (int i = 3 + dllCount; i < argc; ++i) {
        cmdLine += " ";
        cmdLine += argv[i];
    }

    STARTUPINFO si = { sizeof(si) };
    PROCESS_INFORMATION pi;

    cout << "[Injector] Starting GTA: " << gtaPath << endl;
    if (!CreateProcess(NULL, (LPSTR)cmdLine.c_str(), NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi)) {
        cerr << "[Injector] Failed to start GTA. Error: " << GetLastError() << endl;
        return 1;
    }

    cout << "[Injector] Waiting for game engine (vorbis)..." << endl;
    bool ready = false;
    for (int i = 0; i < 200; i++) {
        if (IsModuleLoaded(pi.dwProcessId, "vorbis")) {
            ready = true;
            break;
        }
        Sleep(100);
    }

    if (ready) {
        cout << "[Injector] Engine ready. Injecting " << dlls.size() << " DLL(s)..." << endl;
        for (const string& dll : dlls) {
            cout << "[Injector] Injecting: " << dll << " -> ";
            if (InjectDLL(pi.dwProcessId, dll)) {
                cout << "SUCCESS" << endl;
            } else {
                cout << "FAILED" << endl;
            }
        }
    } else {
        cerr << "[Injector] Timeout: Engine did not initialize in time. Killing process." << endl;
        TerminateProcess(pi.hProcess, 1);
        return 1;
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    cout << "[Injector] Done. Closing injector proxy." << endl;
    return 0;
}