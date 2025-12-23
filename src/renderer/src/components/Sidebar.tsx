import React, { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import clsx from 'clsx';

const StatItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-bg-input p-2 rounded border border-border flex flex-col justify-center">
    <label className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider mb-0.5">{label}</label>
    <span className="text-xs text-gray-300 truncate block font-medium">{value}</span>
  </div>
);

export const Sidebar = () => {
  const { getSelectedServer, selectServer, playerList, toggleFavorite, openJoinModal, selectedServerDetails, selectedServerId } = useAppStore();

  const selectedServer = getSelectedServer();

  useEffect(() => {
    if (selectedServerId && !selectedServer) {
      selectServer(null);
    }
  }, [selectedServerId, selectedServer, selectServer]);

  if (!selectedServer) return (
    <div className="w-[320px] bg-bg-panel border-l border-border flex flex-col items-center justify-center text-gray-600">
      <i className="ri-layout-masonry-line text-5xl mb-4 opacity-20"></i>
      <p className="text-sm font-semibold">Select a server</p>
    </div>
  );

  return (
    <div className="w-[320px] bg-bg-panel border-l border-border flex flex-col h-full">
      <div className="p-6 border-b border-border bg-[#18181b]">
        <h2 className="text-white font-bold text-lg leading-tight mb-1 line-clamp-2">{selectedServer.hostname}</h2>
        <div className="text-xs text-gray-500 font-mono mb-4 select-text">{selectedServer.ip}:{selectedServer.port}</div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatItem label="Players" value={`${selectedServer.players}/${selectedServer.maxPlayers}`} />
          <StatItem label="Ping" value={selectedServer.ping > -1 ? `${selectedServer.ping}ms` : '-'} />
          <StatItem label="Mode" value={selectedServer.mode} />
          <StatItem label="Version" value={selectedServerDetails ? (selectedServerDetails.version || '-') : '...'} />
          <StatItem label="Map" value={selectedServerDetails ? (selectedServerDetails.mapname || '-') : '...'} />
          <StatItem label="Lag Comp" value={selectedServerDetails ? (selectedServerDetails.lagcomp === 'On' ? 'Yes' : 'No') : '...'} />
        </div>

        <div className="flex gap-2 py-2">
          <button
            onClick={openJoinModal}
            className="flex-1 h-10 bg-accent text-gray-300 cursor-pointer hover:bg-accent-hover text-black font-bold rounded shadow-lg shadow-accent/10 transition-all active:scale-95"
          >
            PLAY
          </button>
          <button
            onClick={() => toggleFavorite(selectedServer)}
            title={"Add to favorites"}
            className={clsx(
              "w-10 h-10 rounded cursor-pointer border flex items-center justify-center text-lg transition-colors",
              selectedServer.isFavorite ? "bg-accent hover:bg-accent-hover border-accent text-white" : "border-border text-gray-500 hover:text-white hover:bg-accent-hover hover:bg-white/5"
            )}
          >
            <i className={selectedServer.isFavorite ? "ri-star-fill" : "ri-star-line"}></i>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-bg-input/50">
        <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-border bg-bg-panel flex justify-between">
          <span>Player Name</span>
          <span>Score</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {playerList.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-600 italic">No players online or loading...</div>
          ) : playerList.map((p, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-400 py-1 px-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded">
              <span>{p.name}</span>
              <span className="font-mono text-gray-500">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};