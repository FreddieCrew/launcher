import { useAppStore } from '../store/useAppStore';

export const ErrorModal = () => {
  const { errorMsg, clearError } = useAppStore();

  if (!errorMsg) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-bg-panel border border-danger/50 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        <div className="px-6 py-4 border-b border-border bg-danger/10 flex items-center gap-3">
          <i className="ri-error-warning-fill text-danger text-xl"></i>
          <h3 className="text-white font-bold">Launch Error</h3>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            {errorMsg}
          </p>

          <div className="mt-4 p-3 bg-bg-input rounded border border-border">
            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Troubleshooting</p>
            <ul className="text-xs text-gray-400 list-disc list-inside space-y-1">
              <li>Check your GTA San Andreas path in Settings.</li>
              <li>Ensure <span className="font-mono text-gray-300">omp-launcher.exe</span> is installed.</li>
              <li>If on Linux, check your Wine Prefix path.</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 bg-bg-input flex justify-end border-t border-border">
          <button
            onClick={clearError}
            className="px-6 py-2 cursor-pointer bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded border border-white/10 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};