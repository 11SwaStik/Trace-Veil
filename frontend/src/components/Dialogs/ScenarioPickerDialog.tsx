import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X } from 'phosphor-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGetScenarios } from '../../features/dashboard/useSimulations'

export interface ScenarioSelection {
  scenario_id: string
  attack_speed: number
}

interface ScenarioPickerDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (data: ScenarioSelection) => void | Promise<void>
  isLoading?: boolean
}

export function ScenarioPickerDialog({
  isOpen,
  onClose,
  onSelect,
  isLoading = false,
}: ScenarioPickerDialogProps) {
  const { data: scenarios, isLoading: scenariosLoading } = useGetScenarios()
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('')
  const [attackSpeed, setAttackSpeed] = useState<number>(1.0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedScenario = scenarios?.find((s) => s.id === selectedScenarioId)
  const isDisabled = !selectedScenarioId || isSubmitting || scenariosLoading || isLoading

  const handleLaunch = async () => {
    if (!selectedScenarioId) return

    try {
      setIsSubmitting(true)
      await onSelect({
        scenario_id: selectedScenarioId,
        attack_speed: attackSpeed,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedScenarioId('')
      setAttackSpeed(1.0)
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70"
            aria-hidden="true"
          />

          {/* Dialog Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Dialog.Panel className="w-full max-w-md bg-[#131318] border border-[#262630] rounded-xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-2xl font-bold text-[#e0e0e0]">
                    Create New Simulation
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="text-[#888899] hover:text-[#e0e0e0] transition-colors disabled:opacity-50"
                  >
                    <X size={24} weight="bold" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Scenario Selection */}
                  <div>
                    <label className="block text-sm font-medium text-[#e0e0e0] mb-3">
                      Select Scenario
                    </label>
                    <select
                      value={selectedScenarioId}
                      onChange={(e) => setSelectedScenarioId(e.target.value)}
                      disabled={scenariosLoading || isSubmitting}
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-[#262630] rounded-lg text-[#e0e0e0] focus:border-[#1e40af] focus:ring-1 focus:ring-[#1e40af] focus:outline-none disabled:opacity-50 transition-colors"
                    >
                      <option value="">
                        {scenariosLoading ? 'Loading scenarios...' : 'Choose a scenario...'}
                      </option>
                      {scenarios?.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.name}
                        </option>
                      ))}
                    </select>
                    {selectedScenario && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs text-[#888899] mt-2 leading-relaxed"
                      >
                        {selectedScenario.description}
                      </motion.p>
                    )}
                  </div>

                  {/* Attack Speed Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-[#e0e0e0]">Attack Speed</label>
                      <motion.span
                        key={attackSpeed}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-semibold text-[#00d9ff]"
                      >
                        {attackSpeed.toFixed(1)}x
                      </motion.span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={attackSpeed}
                      onChange={(e) => setAttackSpeed(parseFloat(e.target.value))}
                      disabled={isSubmitting}
                      className="w-full h-2 bg-[#262630] rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-[#1e40af]"
                    />
                    <div className="flex justify-between text-xs text-[#888899] mt-2">
                      <span>0.5x</span>
                      <span>4.0x</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 bg-[#1a1a20] text-[#e0e0e0] rounded-lg hover:bg-[#262630] disabled:opacity-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLaunch}
                      disabled={isDisabled}
                      className="flex-1 px-4 py-3 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isSubmitting ? 'Launching...' : 'Launch'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
