import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export const JoinModal = () => {
  const { isJoinModalOpen, closeJoinModal, getSelectedServer, config, savedNicknames, launch } = useAppStore();
  const [nick, setNick] = useState('');
  const [pass, setPass] = useState('');
  const selectedServer = getSelectedServer();

  useEffect(() => {
    if (isJoinModalOpen && selectedServer) {
      const serverKey = `${selectedServer.ip}:${selectedServer.port}`;
      const specificNick = savedNicknames[serverKey];

      setNick(specificNick || config.nickname);
      setPass('');
    }
  }, [isJoinModalOpen, selectedServer, config.nickname, savedNicknames]);

  if (!isJoinModalOpen || !selectedServer) return null;

  const handleLaunch = () => {
    if (!nick.trim()) return;
    launch(pass, nick);
    closeJoinModal();
  };

  const isUsingGlobal = nick === config.nickname;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-bg-panel border border-border w-[400px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        <div className="px-6 py-4 border-b border-border bg-bg-header flex justify-between items-center">
          <div className="overflow-hidden">
            <h3 className="text-white font-bold truncate">{selectedServer.hostname}</h3>
            <div className="text-[10px] text-gray-500 font-mono">{selectedServer.ip}:{selectedServer.port}</div>
          </div>
          <button onClick={closeJoinModal}><i className="ri-close-line cursor-pointer text-gray-400 hover:text-white text-xl"></i></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Nickname</label>
              <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600">
                {isUsingGlobal ? 'Using Global Default' : 'Server Specific'}
              </span>
            </div>
            <input
              type="text"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={24}
              className="w-full bg-bg-input border border-border rounded px-3 py-3 text-sm text-white focus:border-accent outline-none font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase flex justify-between">
              <span>Password</span>
              {!selectedServer.password && <span className="text-gray-600 font-normal normal-case">(Optional)</span>}
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
              autoFocus={selectedServer.password}
              className="w-full bg-bg-input border border-border rounded px-3 py-3 text-sm text-white focus:border-accent outline-none font-mono"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-bg-input flex justify-end gap-3 border-t border-border">
          <button onClick={closeJoinModal} className="px-4 py-2 cursor-pointer text-xs font-bold text-gray-400 hover:text-white">Cancel</button>
          <button
            onClick={handleLaunch}
            className="px-6 py-2 text-gray-300 cursor-pointer bg-accent hover:bg-accent-hover text-black text-xs font-bold rounded shadow-md shadow-accent-500/20"
          >
            CONNECT
          </button>
        </div>
      </div>
    </div>
  );
};