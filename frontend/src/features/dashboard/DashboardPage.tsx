import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetSimulations, useCreateSimulation, useStartSimulation } from './useSimulations'
import { ScenarioPickerDialog } from '../../components/Dialogs/ScenarioPickerDialog'
import type { SimulationStatus } from '../../types/simulation'

const statusConfig: Record<SimulationStatus, { color: string; bgColor: string }> = {
  INITIALIZING: { color: '#888899', bgColor: '#888899/10' },
  RUNNING: { color: '#3b82f6', bgColor: '#3b82f6/10' },
  PAUSED: { color: '#eab308', bgColor: '#eab308/10' },
  COMPLETED: { color: '#22c55e', bgColor: '#22c55e/10' },
  STOPPED: { color: '#ef4444', bgColor: '#ef4444/10' },
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: simulations, isLoading, error } = useGetSimulations()
  const createSimulation = useCreateSimulation()
  const startSimulation = useStartSimulation()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (startedAt: string | null, completedAt: string | null) => {
    if (!startedAt || !completedAt) return '—'
    const start = new Date(startedAt).getTime()
    const end = new Date(completedAt).getTime()
    const seconds = Math.floor((end - start) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const handleScenarioSelect = async (data: { scenario_id: string; attack_speed: number }) => {
    try {
      setIsLaunching(true)

      const simulation = await createSimulation.mutateAsync(data)
      await startSimulation.mutateAsync(simulation.id)

      setIsDialogOpen(false)
      navigate(`/simulation/${simulation.id}`)
    } catch (error) {
      console.error('Failed to launch simulation:', error)
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#e0e0e0]">Dashboard</h1>
          <p className="text-[#888899] mt-2">Manage your attack simulations</p>
        </div>
        <button
          onClick={() => setIsDialogOpen(true)}
          className="px-6 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors font-medium"
        >
          + New Simulation
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-[#ef4444]/10 border border-[#ef4444] rounded text-[#ef4444] text-sm">
          Failed to load simulations. Please try again.
        </div>
      )}

      {/* Simulations Table */}
      <div className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-[#1a1a20] rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : simulations && simulations.length > 0 ? (
          <table className="w-full">
            <thead className="border-b border-[#262630] bg-[#0a0a0f]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#e0e0e0]">Scenario</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#e0e0e0]">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#e0e0e0]">Speed</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#e0e0e0]">Started</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#e0e0e0]">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262630]">
              {simulations.map((sim) => {
                const config = statusConfig[sim.status]
                return (
                  <tr
                    key={sim.id}
                    onClick={() => navigate(`/simulation/${sim.id}`)}
                    className="hover:bg-[#1a1a20] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-[#e0e0e0]">{sim.scenario_id}</td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                        style={{ color: config.color, backgroundColor: config.bgColor }}
                      >
                        {sim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#e0e0e0]">{sim.attack_speed}x</td>
                    <td className="px-6 py-4 text-sm text-[#888899]">{formatDate(sim.started_at)}</td>
                    <td className="px-6 py-4 text-sm text-[#888899]">
                      {formatDuration(sim.started_at, sim.completed_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[#888899] mb-4">No simulations yet</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="inline-block px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors text-sm font-medium"
            >
              Launch Your First Simulation
            </button>
          </div>
        )}
      </div>

      {/* Scenario Picker Dialog */}
      <ScenarioPickerDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSelect={handleScenarioSelect}
        isLoading={isLaunching}
      />
    </div>
  )
}
