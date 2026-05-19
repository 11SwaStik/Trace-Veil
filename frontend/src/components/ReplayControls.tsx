import { motion } from 'framer-motion'
import { Pause, Play, Square } from 'phosphor-react'

interface ReplayControlsProps {
  status: 'PLAYING' | 'PAUSED' | 'STOPPED'
  currentSpeed: number
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onSpeedChange: (multiplier: number) => void
}

const speedOptions = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1.0 },
  { label: '2x', value: 2.0 },
  { label: '4x', value: 4.0 },
  { label: '8x', value: 8.0 },
]

export function ReplayControls({
  status,
  currentSpeed,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
}: ReplayControlsProps) {
  const isPauseDisabled = status !== 'PLAYING'
  const isResumeDisabled = status !== 'PAUSED'

  return (
    <div className="bg-[#0a0a0f] border-t border-[#262630] px-6 py-3 flex items-center justify-between h-16">
      {/* Left: Controls */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={!isPauseDisabled ? { scale: 1.05 } : {}}
          whileTap={!isPauseDisabled ? { scale: 0.95 } : {}}
          onClick={onPause}
          disabled={isPauseDisabled}
          className={`p-2 rounded transition-colors ${
            isPauseDisabled
              ? 'bg-[#0a0a0f] text-[#666677] cursor-not-allowed'
              : 'bg-[#131318] text-[#e0e0e0] hover:bg-[#1a1a20] active:bg-[#202025]'
          }`}
          title={isPauseDisabled ? 'Can only pause while playing' : 'Pause'}
        >
          <Pause size={20} weight="fill" />
        </motion.button>

        <motion.button
          whileHover={!isResumeDisabled ? { scale: 1.05 } : {}}
          whileTap={!isResumeDisabled ? { scale: 0.95 } : {}}
          onClick={onPlay}
          disabled={isResumeDisabled}
          className={`p-2 rounded transition-colors ${
            isResumeDisabled
              ? 'bg-[#0a0a0f] text-[#666677] cursor-not-allowed'
              : 'bg-[#131318] text-[#e0e0e0] hover:bg-[#1a1a20] active:bg-[#202025]'
          }`}
          title={isResumeDisabled ? 'Can only resume when paused' : 'Play'}
        >
          <Play size={20} weight="fill" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStop}
          className="p-2 rounded bg-[#131318] text-[#e0e0e0] hover:bg-[#1a1a20] active:bg-[#202025] transition-colors"
          title="Stop"
        >
          <Square size={20} weight="fill" />
        </motion.button>
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          status === 'PLAYING' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`} />
        <span className="text-sm font-medium text-[#e0e0e0] capitalize">{status}</span>
      </div>

      {/* Right: Speed selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#a0a0b0]">Speed:</span>
        <div className="flex gap-2">
          {speedOptions.map((option) => (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSpeedChange(option.value)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                Math.abs(currentSpeed - option.value) < 0.01
                  ? 'bg-[#00d9ff] text-[#0a0a0f]'
                  : 'bg-[#131318] text-[#e0e0e0] hover:bg-[#1a1a20]'
              }`}
            >
              {option.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
