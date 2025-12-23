import { useAppStore } from '../store/useAppStore';

export const SettingsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { config, updateConfig, saveConfig } = useAppStore();
  if (!isOpen) return null;

  const browse = async (key: 'gtaPath' | 'winePrefix' | 'launcherPath', type: 'file' | 'directory') => {
    const path = await window.api.config.selectPath(type);
    if (path) updateConfig(key, path);
  };

  const save = () => { saveConfig(); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-bg-panel border border-border w-[500px] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-bg-header">
          <h3 className="text-white font-bold">Settings</h3>
          <button onClick={onClose}><i className="ri-close-line text-gray-400 hover:text-white text-xl"></i></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Global Default Nickname</label>
            <input
              type="text"
              value={config.nickname}
              onChange={(e) => updateConfig('nickname', e.target.value)}
              className="w-full bg-bg-input border border-border rounded px-3 py-2 text-sm text-white focus:border-accent outline-none"
              placeholder="Used if no specific server nickname is set"
            />
            <p className="text-[10px] text-gray-600">This will be used for any new server you join.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">GTA San Andreas Path</label>
            <div className="flex gap-2">
              <input readOnly value={config.gtaPath} className="flex-1 bg-bg-input border border-border rounded px-3 py-2 text-xs text-gray-400" />
              <button onClick={() => browse('gtaPath', 'directory')} className="px-3 bg-white/5 cursor-pointer hover:bg-white/10 border border-border rounded text-xs text-gray-300">Browse</button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Launcher Path (Optional)</label>
            <div className="flex gap-2">
              <input readOnly value={config.launcherPath} className="flex-1 bg-bg-input border border-border rounded px-3 py-2 text-xs text-gray-400" />
              <button onClick={() => browse('launcherPath', 'file')} className="px-3 bg-white/5 cursor-pointer hover:bg-white/10 border border-border rounded text-xs text-gray-300">Browse</button>
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <p className="text-[10px] text-gray-600 mb-2 uppercase font-bold">Linux / Wine Config</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Wine Prefix</label>
                <input value={config.winePrefix} onChange={(e) => updateConfig('winePrefix', e.target.value)} className="w-full bg-bg-input border border-border rounded px-2 py-1 text-xs text-gray-400" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500">Wine Binary</label>
                <input value={config.wineBinary} onChange={(e) => updateConfig('wineBinary', e.target.value)} className="w-full bg-bg-input border border-border rounded px-2 py-1 text-xs text-gray-400" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-bg-input flex justify-end gap-3 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs cursor-pointer font-bold text-gray-400 hover:text-white">Cancel</button>
          <button onClick={save} className="px-6 py-2 bg-accent cursor-pointer hover:bg-accent-hover text-white text-xs font-bold rounded">Save Changes</button>
        </div>
      </div>
    </div>
  );
};