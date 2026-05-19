import { motion } from 'framer-motion'
import { Pause, Play, Square } from 'phosphor-react'
import type { SimulationStatus } from '../types/simulation'

interface SimulationControlsProps {
  status: SimulationStatus
  attackSpeed: number
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export function SimulationControls({ status, attackSpeed, onPause, onResume, onStop }: SimulationControlsProps) {
  const isPauseDisabled = status !== 'RUNNING'
  const isResumeDisabled = status !== 'PAUSED'

  const statusIndicatorColor = status === 'RUNNING' ? '#22c55e' : status === 'PAUSED' ? '#eab308' : '#6b7280'
  const isRunning = status === 'RUNNING'

  return (
    <div className="bg-[#0a0a0f] border-t border-[#262630] px-6 py-3 flex items-center justify-between h-16">
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
          title={isPauseDisabled ? 'Can only pause while running' : 'Pause simulation'}
        >
          <Pause size={20} weight="fill" />
        </motion.button>

        <motion.button
          whileHover={!isResumeDisabled ? { scale: 1.05 } : {}}
          whileTap={!isResumeDisabled ? { scale: 0.95 } : {}}
          onClick={onResume}
          disabled={isResumeDisabled}
          className={`p-2 rounded transition-colors ${
            isResumeDisabled
              ? 'bg-[#0a0a0f] text-[#666677] cursor-not-allowed'
              : 'bg-[#131318] text-[#e0e0e0] hover:bg-[#1a1a20] active:bg-[#202025]'
          }`}
          title={isResumeDisabled ? 'Can only resume when paused' : 'Resume simulation'}
        >
          <Play size={20} weight="fill" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStop}
          className="p-2 rounded bg-[#131318] text-[#e0e0e0] hover:bg-[#1a1a20] active:bg-[#202025] transition-colors"
          title="Stop simulation"
        >
          <Square size={20} weight="fill" />
        </motion.button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={isRunning ? { scale: [1, 1.3, 1] } : {}}
            transition={isRunning ? { duration: 1.5, repeat: Infinity } : {}}
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: statusIndicatorColor }}
          />
          <span className="text-sm font-medium text-[#e0e0e0] capitalize">{status}</span>
        </div>
      </div>

      <div className="text-sm font-semibold text-[#a0a0b0]">
        Speed: <span className="text-[#e0e0e0]">{attackSpeed.toFixed(1)}x</span>
      </div>
    </div>
  )
}
