import { useState } from 'react'
import { motion } from 'framer-motion'

interface TimelineScrubberProps {
  currentPosition: number // 0.0 to 1.0
  totalEvents: number
  totalDurationMs: number
  onSeek: (position: number) => void
  disabled?: boolean
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function TimelineScrubber({
  currentPosition,
  totalEvents,
  totalDurationMs,
  onSeek,
  disabled = false,
}: TimelineScrubberProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [hoverPosition, setHoverPosition] = useState(0)

  const currentMs = currentPosition * totalDurationMs
  const currentEvent = Math.floor(currentPosition * totalEvents)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value) / 100
    onSeek(value)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setHoverPosition(percentage)
  }

  return (
    <div className="w-full space-y-2">
      {/* Scrubber track with hover tooltip */}
      <motion.div
        className="relative w-full px-0"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Hover tooltip */}
        {isHovering && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-full left-0 right-0 flex justify-center mb-2 pointer-events-none"
            style={{
              left: `${hoverPosition * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="bg-[#262630] text-[#e0e0e0] text-xs px-2 py-1 rounded whitespace-nowrap">
              Event {Math.floor(hoverPosition * totalEvents)} / {totalEvents}
            </div>
          </motion.div>
        )}

        {/* Input slider */}
        <input
          type="range"
          min="0"
          max="100"
          value={currentPosition * 100}
          onChange={handleChange}
          disabled={disabled}
          className="w-full h-1 bg-[#262630] rounded-lg appearance-none cursor-pointer accent-[#00d9ff] disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#00d9ff]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:hover:bg-cyan-400
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#00d9ff]
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:hover:bg-cyan-400"
        />
      </motion.div>

      {/* Time labels */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-[#666677]">
          {formatTime(currentMs)}
        </span>
        <span className="text-xs text-[#888899]">
          Event {currentEvent} / {totalEvents}
        </span>
        <span className="text-xs text-[#666677]">
          {formatTime(totalDurationMs)}
        </span>
      </div>
    </div>
  )
}
