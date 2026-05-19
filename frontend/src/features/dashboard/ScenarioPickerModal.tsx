import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X } from 'phosphor-react'
import { useGetScenarios, useCreateSimulation, useStartSimulation } from './useSimulations'
import { useNavigate } from 'react-router-dom'
import type { CreateSimulationRequest } from '../../types/simulation'

interface ScenarioPickerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ScenarioPickerModal({ isOpen, onClose }: ScenarioPickerModalProps) {
  const navigate = useNavigate()
  const { data: scenarios, isLoading: scenariosLoading } = useGetScenarios()
  const createSimulation = useCreateSimulation()
  const startSimulation = useStartSimulation()

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('')
  const [attackSpeed, setAttackSpeed] = useState<number>(1.0)
  const [isLaunching, setIsLaunching] = useState(false)

  const handleLaunch = async () => {
    if (!selectedScenarioId) return

    try {
      setIsLaunching(true)

      const createPayload: CreateSimulationRequest = {
        scenario_id: selectedScenarioId,
        attack_speed: attackSpeed,
      }

      const simulation = await createSimulation.mutateAsync(createPayload)

      await startSimulation.mutateAsync(simulation.id)

      onClose()
      navigate(`/simulation/${simulation.id}`)
    } catch (error) {
      console.error('Failed to launch simulation:', error)
    } finally {
      setIsLaunching(false)
    }
  }

  const selectedScenario = scenarios?.find((s) => s.id === selectedScenarioId)

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md bg-[#131318] border border-[#262630] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-xl font-bold text-[#e0e0e0]">New Simulation</Dialog.Title>
            <button
              onClick={onClose}
              className="text-[#888899] hover:text-[#e0e0e0] transition-colors"
            >
              <X size={24} weight="bold" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Scenario Selection */}
            <div>
              <label className="block text-sm font-medium text-[#e0e0e0] mb-2">Select Scenario</label>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                disabled={scenariosLoading || isLaunching}
                className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#262630] rounded text-[#e0e0e0] focus:border-[#1e40af] focus:outline-none disabled:opacity-50 transition-colors"
              >
                <option value="">Choose a scenario...</option>
                {scenarios?.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>
              {selectedScenario && (
                <p className="text-xs text-[#888899] mt-2">{selectedScenario.description}</p>
              )}
            </div>

            {/* Attack Speed Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[#e0e0e0]">Attack Speed</label>
                <span className="text-sm font-semibold text-[#00d9ff]">{attackSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={attackSpeed}
                onChange={(e) => setAttackSpeed(parseFloat(e.target.value))}
                disabled={isLaunching}
                className="w-full h-2 bg-[#262630] rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-[#1e40af]"
              />
              <div className="flex justify-between text-xs text-[#888899] mt-1">
                <span>0.5x (Slowest)</span>
                <span>4.0x (Fastest)</span>
              </div>
            </div>

            {/* Error State */}
            {createSimulation.error && (
              <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444] rounded text-sm text-[#ef4444]">
                Failed to create simulation. Please try again.
              </div>
            )}

            {startSimulation.error && (
              <div className="p-3 bg-[#ef4444]/10 border border-[#ef4444] rounded text-sm text-[#ef4444]">
                Failed to start simulation. Please try again.
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={isLaunching}
                className="flex-1 px-4 py-2 bg-[#1a1a20] text-[#e0e0e0] rounded hover:bg-[#262630] disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={!selectedScenarioId || isLaunching || scenariosLoading}
                className="flex-1 px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLaunching ? 'Launching...' : 'Launch'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
