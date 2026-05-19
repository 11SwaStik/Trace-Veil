import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play } from 'phosphor-react'
import { useReplays } from './useReplays'
import type { Replay } from '../../types/simulation'

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function ReplayCard({ replay }: { replay: Replay }) {
  const navigate = useNavigate()

  const handlePlay = () => {
    navigate(`/replay/${replay.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden hover:bg-[#1a1a1f] transition-colors duration-300 cursor-pointer flex flex-col h-full"
      onClick={handlePlay}
    >
      {/* Thumbnail Area */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-[#00d9ff] via-[#262630] to-[#131318] flex items-center justify-center group">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="w-16 h-16 bg-[#00d9ff] rounded-full flex items-center justify-center group-hover:bg-cyan-400 transition-colors"
        >
          <Play size={32} weight="fill" color="#0a0a0f" />
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Title & ID */}
        <div>
          <h3 className="text-base font-semibold text-[#e0e0e0] truncate">{replay.name}</h3>
          <p className="text-xs text-[#666677] truncate">ID: {replay.simulation_id.slice(0, 8)}...</p>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[#888899]">Events:</span>
            <span className="font-medium text-[#e0e0e0]">{replay.total_events}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888899]">Duration:</span>
            <span className="font-medium text-[#e0e0e0]">{formatDuration(replay.duration_ms)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-[#262630] flex items-center justify-between">
          <span className="text-xs text-[#666677]">{formatRelativeTime(replay.created_at)}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation()
              handlePlay()
            }}
            className="px-3 py-1.5 bg-[#00d9ff] text-[#0a0a0f] text-xs font-semibold rounded hover:bg-cyan-400 transition-colors"
          >
            Play
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function ReplayCardSkeleton() {
  return (
    <div className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-[#1a1a1f]" />
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="h-4 bg-[#1a1a1f] rounded w-3/4" />
          <div className="h-3 bg-[#1a1a1f] rounded w-1/2" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#1a1a1f] rounded" />
          <div className="h-3 bg-[#1a1a1f] rounded w-4/5" />
        </div>
        <div className="h-8 bg-[#1a1a1f] rounded mt-4" />
      </div>
    </div>
  )
}

export function ReplayLibraryPage() {
  const navigate = useNavigate()
  const { data: replays, isLoading, error } = useReplays()

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Replays</h2>
          <p className="text-[#888899] mb-4">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const isEmpty = !isLoading && (!replays || replays.length === 0)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-6 border-b border-[#262630]">
        <h1 className="text-3xl font-bold text-[#e0e0e0] mb-2">Replay Library</h1>
        <p className="text-[#888899]">Browse and play back completed simulations</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEmpty ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#262630] rounded-full flex items-center justify-center mx-auto mb-4">
                <Play size={32} color="#888899" />
              </div>
              <h2 className="text-xl font-semibold text-[#e0e0e0] mb-2">No Replays Yet</h2>
              <p className="text-[#888899] mb-6">Run a simulation to create your first replay.</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 bg-[#00d9ff] text-[#0a0a0f] font-semibold rounded hover:bg-cyan-400 transition-colors"
              >
                Create Simulation
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <ReplayCardSkeleton key={i} />)
              : replays!.map((replay) => <ReplayCard key={replay.id} replay={replay} />)}
          </div>
        )}
      </div>
    </div>
  )
}
