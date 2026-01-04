import React, { useMemo, useEffect, useRef, useCallback } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import clsx from 'clsx'
import { useAppStore } from '../store/useAppStore'
import { Server } from '../store/types'

const ServerRow = React.memo(
  ({
    server,
    selectServer,
    isSelected
  }: {
    server: Server
    selectServer: (s: Server) => void
    isSelected: boolean
  }) => {
    return (
      <div className="px-3 py-[2px]">
        <div
          onClick={() => selectServer(server)}
          className={clsx(
            'group grid grid-cols-[30px_1fr_60px_130px_70px] items-center gap-3',
            'px-2 h-[34px]',
            'rounded-md',
            'cursor-pointer select-none transition-all duration-150 border',
            isSelected
              ? 'bg-accent/10 border-accent/40 shadow-[inset_2px_0_0_0] shadow-accent'
              : 'bg-transparent border-transparent hover:bg-[#1f1f22] hover:border-white/5'
          )}
        >
          <div className="flex justify-center">
            {server.password ? (
              <div className="w-5 h-5 rounded flex items-center justify-center bg-danger/10 text-danger">
                <i className="ri-lock-2-fill text-[10px]" />
              </div>
            ) : (
              <i
                className={clsx(
                  'ri-lock-unlock-line text-xs opacity-20 group-hover:opacity-50 transition-opacity',
                  isSelected && 'opacity-100 text-accent'
                )}
              />
            )}
          </div>

          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={clsx(
                'w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors',
                isSelected
                  ? 'bg-accent text-white'
                  : 'bg-[#27272a] text-gray-500 group-hover:text-gray-300'
              )}
            >
              <i className="ri-gamepad-line text-[10px]"></i>
            </div>
            <div className="min-w-0 flex flex-col">
              <span
                className={clsx(
                  'text-[12px] font-medium truncate leading-none',
                  isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'
                )}
              >
                {server.hostname}
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono opacity-80">
            <span
              className={
                server.ping < 100
                  ? 'text-success'
                  : server.ping < 200
                    ? 'text-yellow-500'
                    : 'text-danger'
              }
            >
              {server.ping > -1 ? server.ping : '-'}
            </span>
            <span className="text-gray-600 ml-0.5">ms</span>
          </div>

          <div className="truncate text-[11px] text-gray-500 text-center font-medium group-hover:text-gray-400">
            {server.mode}
          </div>

          <div className="text-right text-[11px]">
            <span
              className={clsx(
                'font-bold',
                isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
              )}
            >
              {server.players}
            </span>
            <span className="text-gray-700 mx-0.5">/</span>
            <span className="text-gray-600">{server.maxPlayers}</span>
          </div>
        </div>
      </div>
    )
  },
  (prev, next) => {
    return prev.server === next.server && prev.isSelected === next.isSelected
  }
)

export const ServerList = () => {
  const { servers, pingServers, selectServer, selectedServerId, searchQuery } = useAppStore()
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const visibleRangeRef = useRef({ startIndex: 0, endIndex: 15 })

  const filteredServers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return servers
    return servers.filter(
      (s) => s.hostname.toLowerCase().includes(q) || s.mode.toLowerCase().includes(q)
    )
  }, [servers, searchQuery])

  const handleRangeChanged = useCallback(
    ({ startIndex, endIndex }: { startIndex: number; endIndex: number }) => {
      visibleRangeRef.current = { startIndex, endIndex }
      if (filteredServers.length === 0) return
      const subset = filteredServers.slice(startIndex, endIndex + 1)
      pingServers(subset, false)
    },
    [filteredServers, pingServers]
  )

  useEffect(() => {
    const interval = setInterval(() => {
      if (filteredServers.length === 0) return
      const { startIndex, endIndex } = visibleRangeRef.current
      const subset = filteredServers.slice(startIndex, endIndex + 1)
      if (subset.length > 0) {
        pingServers(subset, true)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [filteredServers, pingServers])

  useEffect(() => {
    if (filteredServers.length > 0 && filteredServers.length <= 20) {
      pingServers(filteredServers, false)
    }
  }, [filteredServers.length])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-app">
      <div className="grid grid-cols-[30px_1fr_60px_130px_70px] gap-3 px-6 py-2 shrink-0 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-b border-white/5">
        <div className="text-center">
          <i className="ri-lock-line"></i>
        </div>
        <div>Name</div>
        <div className="text-right">Ping</div>
        <div className="text-center">Mode</div>
        <div className="text-right">Players</div>
      </div>

      <div className="flex-1 w-full h-full relative min-h-0">
        {filteredServers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 italic z-10">
            {searchQuery ? 'No servers match your search.' : 'No servers found.'}
          </div>
        )}

        {filteredServers.length > 0 && (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={filteredServers}
            fixedItemHeight={38}
            rangeChanged={handleRangeChanged}
            overscan={5}
            className="scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent"
            itemContent={(_index, server) => {
              const currentId = `${server.ip}:${server.port}`
              const isSelected = selectedServerId === currentId

              return (
                <ServerRow server={server} selectServer={selectServer} isSelected={isSelected} />
              )
            }}
          />
        )}
      </div>
    </div>
  )
}
