export const TitleBar = () => {
  const handleWin = (act: 'min' | 'max' | 'close') => {
    // @ts-ignore
    window.api.window[act]()
  }

  return (
    <header
      className="h-[34px] bg-black flex items-center justify-between pl-4 select-none"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-400 text-xs tracking-wider">OPEN.MP LAUNCHER</span>
      </div>
      <div className="h-full flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button onClick={() => handleWin('min')} className="w-12 hover:bg-white/10 text-gray-400">
          <i className="ri-subtract-line"></i>
        </button>
        <button onClick={() => handleWin('max')} className="w-12 hover:bg-white/10 text-gray-400">
          <i className="ri-checkbox-blank-line"></i>
        </button>
        <button
          onClick={() => handleWin('close')}
          className="w-12 hover:bg-danger hover:text-white text-gray-400"
        >
          <i className="ri-close-line"></i>
        </button>
      </div>
    </header>
  )
}
