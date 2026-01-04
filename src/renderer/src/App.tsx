import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import { ServerList } from './components/ServerList'
import { Sidebar } from './components/Sidebar'
import { SettingsModal } from './components/SettingsModal'
import { JoinModal } from './components/JoinModal'
import { AddServerModal } from './components/AddServerModal'
import { ErrorModal } from './components/ErrorModal'
import clsx from 'clsx'
import 'remixicon/fonts/remixicon.css'
import icon from './assets/icon.svg'

export default function App() {
  const {
    init,
    currentTab,
    setTab,
    isLoading,
    getSelectedServer,
    toggleFavorite,
    openAddModal,
    config,
    updateConfig,
    saveConfig,
    setSearchQuery,
    searchQuery
  } = useAppStore()

  const [showSettings, setShowSettings] = useState(false)
  const selectedServer = getSelectedServer()

  useEffect(() => {
    init()
  }, [])

  const handleWin = (action: string) => {
    if ((window as any).api?.window) {
      ;(window as any).api.window[action]()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-bg-app text-gray-200 overflow-hidden select-none font-sans">
      <header
        className="h-[34px] bg-black flex items-center justify-between pl-4 select-none shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <div className="font-bold text-gray-500 text-[10px] tracking-widest flex items-center gap-2">
          <img src={icon} className="w-4 h-4" />
        </div>
        <div className="h-full flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => handleWin('minimize')}
            className="w-10 hover:bg-white/10 text-gray-500 transition-colors"
          >
            <i className="ri-subtract-line"></i>
          </button>
          <button
            onClick={() => handleWin('maximize')}
            className="w-10 hover:bg-white/10 text-gray-500 transition-colors"
          >
            <i className="ri-checkbox-blank-line"></i>
          </button>
          <button
            onClick={() => handleWin('close')}
            className="w-10 hover:bg-danger hover:text-white text-gray-500 transition-colors"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      </header>

      <div className="h-[60px] bg-bg-header border-b border-border flex items-center px-4 gap-4 shrink-0">
        <div className="flex bg-bg-input p-1 rounded-md border border-border">
          <button
            onClick={() => setTab('favorites')}
            className={clsx(
              'px-4 py-1.5 text-xs font-bold rounded transition-all',
              currentTab === 'favorites'
                ? 'bg-bg-panel text-accent shadow'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            FAVORITES
          </button>
          <button
            onClick={() => setTab('internet')}
            className={clsx(
              'px-4 py-1.5 text-xs font-bold rounded transition-all',
              currentTab === 'internet'
                ? 'bg-bg-panel text-accent shadow'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            INTERNET
          </button>
        </div>

        <div className="flex-1 bg-bg-input h-9 rounded border border-border flex items-center px-3 text-gray-500 gap-2 focus-within:border-accent transition-colors">
          <i className="ri-search-line"></i>
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-gray-600"
          />
        </div>

        <div className="flex items-center gap-2 bg-bg-input px-3 h-9 rounded border border-border focus-within:border-accent transition-colors group">
          <i className="ri-user-3-line text-gray-500 group-focus-within:text-accent transition-colors"></i>
          <input
            type="text"
            value={config.nickname}
            onChange={(e) => updateConfig('nickname', e.target.value)}
            onBlur={() => saveConfig()}
            placeholder="Nickname"
            className="bg-transparent border-none outline-none text-sm text-white w-[140px] placeholder:text-gray-600 font-bold"
            spellCheck={false}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            title="Add Favorite Server"
            className="w-9 h-9 cursor-pointer rounded border border-border bg-bg-panel text-gray-400 hover:text-white hover:border-accent transition-all"
          >
            <i className="ri-add-line"></i>
          </button>

          <button
            onClick={() => selectedServer && toggleFavorite(selectedServer)}
            disabled={!(currentTab === 'favorites' && selectedServer)}
            title="Remove from Favorites"
            className="w-9 h-9 cursor-pointer rounded border border-border bg-bg-panel text-gray-400 hover:text-danger hover:border-danger hover:bg-danger/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="ri-delete-bin-6-line"></i>
          </button>

          <div className="w-[1px] h-6 bg-border mx-1"></div>

          <button
            onClick={() => setShowSettings(true)}
            title="Launcher Settings"
            className="w-9 h-9 cursor-pointer rounded border border-border bg-bg-panel text-gray-400 hover:text-white hover:border-accent transition-colors"
          >
            <i className="ri-settings-3-fill"></i>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-bg-app/80 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-accent">
              <i className="ri-loader-4-line text-3xl animate-spin"></i>
              <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                Fetching masterlist
              </span>
            </div>
          </div>
        )}

        <ServerList />
        <Sidebar />
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <JoinModal />
      <AddServerModal />
      <ErrorModal />
    </div>
  )
}
