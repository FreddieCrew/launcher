import { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const AddServerModal = () => {
  const { isAddModalOpen, closeAddModal, addFavorite } = useAppStore()
  const [address, setAddress] = useState('')
  const [isProcessing, setProcessing] = useState(false)

  useEffect(() => {
    if (isAddModalOpen) {
      setAddress('')
      setProcessing(false)
    }
  }, [isAddModalOpen])

  if (!isAddModalOpen) return null

  const handleSubmit = async () => {
    if (!address.trim()) return
    setProcessing(true)
    await addFavorite(address)
    setProcessing(false)
    closeAddModal()
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-bg-panel border border-border w-[400px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border bg-bg-header flex justify-between items-center">
          <h3 className="text-white font-bold">Add Server</h3>
          <button onClick={closeAddModal}>
            <i className="ri-close-line cursor-pointer text-gray-400 hover:text-white text-xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">IP Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="127.0.0.1:7777"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-bg-input border border-border rounded px-3 py-3 text-sm text-white focus:border-accent outline-none font-mono"
            />
            <p className="text-[10px] text-gray-600 pt-1">
              The server will be queried automatically.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-bg-input flex justify-end gap-3 border-t border-border">
          <button
            onClick={closeAddModal}
            className="px-4 py-2 cursor-pointer text-xs font-bold text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded shadow-lg shadow-accent/20 disabled:opacity-50"
          >
            {isProcessing ? 'ADDING...' : 'ADD FAVORITE'}
          </button>
        </div>
      </div>
    </div>
  )
}
