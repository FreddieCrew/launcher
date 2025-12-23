import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useAppStore } from '../store/useAppStore';

export const ServerList = () => {
  const { servers, pingVisible, selectServer, selectedServerId } = useAppStore();
  const visibleRange = useRef({ start: 0, end: 15 });

  useEffect(() => {
    const interval = setInterval(() => {
      const { start, end } = visibleRange.current;
      pingVisible(start, end, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [pingVisible]);

  const renderServerRows = () => {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const query = searchInput?.value?.toLowerCase() || '';

    const filteredServers = servers.filter(s =>
      s.hostname.toLowerCase().includes(query) ||
      s.mode.toLowerCase().includes(query)
    );

    visibleRange.current = { start: 0, end: Math.min(filteredServers.length, 15) };

    return filteredServers.map((server) => {
      const currentId = `${server.ip}:${server.port}`;
      const isSelected = selectedServerId === currentId;

      return (
        <div
          key={currentId}
          onClick={() => selectServer(server)}
          className={clsx(
            "group grid grid-cols-[30px_1fr_60px_130px_70px] items-center gap-3",
            "px-3 py-2",
            "rounded-md",
            "cursor-pointer select-none transition-all duration-150 border",

            isSelected
              ? "bg-accent/10 border-accent/40 shadow-[inset_2px_0_0_0] shadow-accent"
              : "bg-transparent border-transparent hover:bg-[#1f1f22] hover:border-white/5"
          )}
        >
          <div className="flex justify-center">
            {server.password ? (
              <div className="w-6 h-6 rounded flex items-center justify-center bg-danger/10 text-danger">
                <i className="ri-lock-2-fill text-[10px]" />
              </div>
            ) : (
              <i className={clsx("ri-lock-unlock-line text-xs opacity-20 group-hover:opacity-50 transition-opacity", isSelected && "opacity-100 text-accent")} />
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={clsx(
              "w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors",
              isSelected ? "bg-accent text-white" : "bg-[#27272a] text-gray-500 group-hover:text-gray-300"
            )}>
              <i className="ri-gamepad-line text-[10px]"></i>
            </div>

            <div className="min-w-0 flex flex-col">
              <span className={clsx(
                "text-[13px] font-medium truncate leading-none mb-0.5",
                isSelected ? "text-white" : "text-gray-300 group-hover:text-white"
              )}>
                {server.hostname}
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono opacity-80">
            <span className={server.ping < 100 ? "text-success" : server.ping < 200 ? "text-yellow-500" : "text-danger"}>
              {server.ping > -1 ? server.ping : '-'}
            </span>
            <span className="text-gray-600 ml-0.5">ms</span>
          </div>

          <div className="truncate text-[11px] text-gray-500 text-center font-medium group-hover:text-gray-400">
            {server.mode}
          </div>

          <div className="text-right text-[11px]">
            <span className={clsx("font-bold", isSelected ? "text-white" : "text-gray-400 group-hover:text-gray-200")}>
              {server.players}
            </span>
            <span className="text-gray-700 mx-0.5">/</span>
            <span className="text-gray-600">{server.maxPlayers}</span>
          </div>
        </div>
      );
    });
  };

  useEffect(() => {
    pingVisible(visibleRange.current.start, visibleRange.current.end, false);
  }, [servers]);

  return (
    <div className="flex-1 bg-bg-app flex flex-col overflow-hidden">
      <div className="grid grid-cols-[30px_1fr_60px_130px_70px] gap-3 px-3 py-2 shrink-0 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5">
        <div className="text-center"><i className="ri-lock-line"></i></div>
        <div>Name</div>
        <div className="text-right">Ping</div>
        <div className="text-center">Mode</div>
        <div className="text-right">Players</div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-2 pb-2 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        {servers.length === 0 ? (
          <div className="text-center py-20 text-xs text-gray-600 italic">No servers found.</div>
        ) : (
          renderServerRows()
        )}
      </div>
    </div>
  );
};