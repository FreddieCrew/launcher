#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0601
#endif

#include <windows.h>
#include <filesystem>
#include <iostream>
#include <string>
#include <tlhelp32.h>
#include <vector>

namespace fs = std::filesystem;
using namespace std;

bool InjectDLL(HANDLE hProcess, const wstring &dllPath) {
  size_t size = (dllPath.length() + 1) * sizeof(wchar_t);

  void *pRemoteMem =
      VirtualAllocEx(hProcess, NULL, size, MEM_COMMIT, PAGE_READWRITE);
  if (!pRemoteMem) {
    wcerr << L"[Injector] Alloc failed: " << GetLastError() << endl;
    return false;
  }

  if (!WriteProcessMemory(hProcess, pRemoteMem, dllPath.c_str(), size, NULL)) {
    wcerr << L"[Injector] Write failed: " << GetLastError() << endl;
    VirtualFreeEx(hProcess, pRemoteMem, 0, MEM_RELEASE);
    return false;
  }

  HMODULE hKernel32 = GetModuleHandleW(L"kernel32.dll");
  LPVOID pLoadLibrary = (LPVOID)GetProcAddress(hKernel32, "LoadLibraryW");

  HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0,
                                      (LPTHREAD_START_ROUTINE)pLoadLibrary,
                                      pRemoteMem, 0, NULL);
  if (!hThread) {
    wcerr << L"[Injector] Thread failed: " << GetLastError() << endl;
    VirtualFreeEx(hProcess, pRemoteMem, 0, MEM_RELEASE);
    return false;
  }

  WaitForSingleObject(hThread, 10000);

  DWORD exitCode = 0;
  GetExitCodeThread(hThread, &exitCode);

  CloseHandle(hThread);
  VirtualFreeEx(hProcess, pRemoteMem, 0, MEM_RELEASE);

  return exitCode != 0;
}

int wmain(int argc, wchar_t *argv[]) {
  // Usage: injector.exe <exe_path> <dll_count> <dll_1> <dll_2> ... <game_args>
  if (argc < 4)
    return 1;

  wstring gtaPath = argv[1];
  int dllCount = _wtoi(argv[2]);

  vector<wstring> dlls;
  for (int i = 0; i < dllCount; i++) {
    dlls.push_back(argv[3 + i]);
  }

  wstring cmdLine = L"\"" + gtaPath + L"\"";
  for (int i = 3 + dllCount; i < argc; ++i) {
    cmdLine += L" ";
    cmdLine += argv[i];
  }

  wstring workDir = fs::path(gtaPath).parent_path().wstring();

  STARTUPINFOW si = {sizeof(si)};
  PROCESS_INFORMATION pi;

  wcout << L"[Injector] Launching: " << gtaPath << endl;
  if (!CreateProcessW(NULL, &cmdLine[0], NULL, NULL, FALSE, CREATE_SUSPENDED,
                      NULL, workDir.c_str(), &si, &pi)) {
    wcerr << L"CreateProcess failed: " << GetLastError() << endl;
    return 1;
  }

  bool success = true;
  for (const auto &dll : dlls) {
    wcout << L"   -> Injecting: " << dll << endl;
    if (!InjectDLL(pi.hProcess, dll)) {
      wcerr << L"      FAILED. Error Code: " << GetLastError() << endl;
      success = false;
      break;
    }
  }

  if (success) {
    wcout << L"[Injector] Resuming Game" << endl;
    ResumeThread(pi.hThread);
  } else {
    wcerr << L"[Injector] Injection failed - Terminating." << endl;
    TerminateProcess(pi.hProcess, 1);
  }

  CloseHandle(pi.hProcess);
  CloseHandle(pi.hThread);
  return 0;
}