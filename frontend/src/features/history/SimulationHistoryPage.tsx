import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, CaretUp, CaretDown } from 'phosphor-react'
import { useSimulationHistory } from './useSimulationHistory'
import type { Simulation, SimulationStatus } from '../../types/simulation'

type SortColumn = 'scenario' | 'status' | 'created' | 'started' | 'completed' | 'speed'
type SortDirection = 'asc' | 'desc'

const statusColors: Record<SimulationStatus, { bg: string; text: string }> = {
  INITIALIZING: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  RUNNING: { bg: 'bg-green-500/20', text: 'text-green-400' },
  PAUSED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  COMPLETED: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  STOPPED: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return '—'
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

export function SimulationHistoryPage() {
  const navigate = useNavigate()
  const { data: simulations, isLoading, error } = useSimulationHistory()
  const [filterStatus, setFilterStatus] = useState<SimulationStatus | 'ALL'>('ALL')
  const [sortColumn, setSortColumn] = useState<SortColumn>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredAndSorted = useMemo(() => {
    if (!simulations) return []

    // Filter
    let filtered = simulations
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter((sim) => sim.status === filterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortColumn) {
        case 'scenario':
          aValue = a.scenario_id.toLowerCase()
          bValue = b.scenario_id.toLowerCase()
          break
        case 'status':
          aValue = a.status.toLowerCase()
          bValue = b.status.toLowerCase()
          break
        case 'speed':
          aValue = a.attack_speed
          bValue = b.attack_speed
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'started':
          aValue = a.started_at ? new Date(a.started_at).getTime() : 0
          bValue = b.started_at ? new Date(b.started_at).getTime() : 0
          break
        case 'completed':
          aValue = a.completed_at ? new Date(a.completed_at).getTime() : 0
          bValue = b.completed_at ? new Date(b.completed_at).getTime() : 0
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [simulations, filterStatus, sortColumn, sortDirection])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSorted.slice(start, start + itemsPerPage)
  }, [filteredAndSorted, currentPage])

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage)

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const handleView = (simulation: Simulation) => {
    if (simulation.status === 'COMPLETED') {
      navigate(`/replay/${simulation.id}`)
    } else {
      navigate(`/simulation/${simulation.id}`)
    }
  }

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <th
      onClick={() => handleSort(column)}
      className="text-left py-3 px-4 text-[#e0e0e0] font-semibold cursor-pointer hover:text-[#00d9ff] transition-colors flex items-center gap-2"
    >
      {label}
      {sortColumn === column && (
        sortDirection === 'asc' ? <CaretUp size={14} /> : <CaretDown size={14} />
      )}
    </th>
  )

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Simulations</h2>
          <p className="text-[#888899]">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#e0e0e0] mb-2">Simulation History</h1>
        <p className="text-[#888899]">Browse and view all your past simulations</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm text-[#888899] mr-3">Filter by status:</label>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as SimulationStatus | 'ALL')
              setCurrentPage(1)
            }}
            className="bg-[#131318] border border-[#262630] rounded px-3 py-2 text-[#e0e0e0] text-sm hover:border-[#00d9ff] transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="INITIALIZING">Initializing</option>
            <option value="RUNNING">Running</option>
            <option value="PAUSED">Paused</option>
            <option value="COMPLETED">Completed</option>
            <option value="STOPPED">Stopped</option>
          </select>
        </div>
        <div className="text-sm text-[#888899]">
          {filteredAndSorted.length} simulation{filteredAndSorted.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-[#262630] border-t-[#00d9ff] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-[#888899]">Loading simulations...</p>
            </div>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#888899]">No simulations found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-[#262630] bg-[#0a0a0f]">
                  <tr>
                    <SortHeader column="scenario" label="Scenario" />
                    <SortHeader column="status" label="Status" />
                    <SortHeader column="speed" label="Speed" />
                    <SortHeader column="created" label="Created" />
                    <SortHeader column="started" label="Started" />
                    <SortHeader column="completed" label="Completed" />
                    <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((simulation, idx) => {
                    const bgColor = idx % 2 === 0 ? 'bg-[#131318]' : 'bg-[#0a0a0f]'
                    const statusColor = statusColors[simulation.status]

                    return (
                      <motion.tr
                        key={simulation.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${bgColor} border-b border-[#262630] hover:bg-[#1a1a20] transition-colors`}
                      >
                        <td className="py-3 px-4 text-[#e0e0e0]">{simulation.scenario_id}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor.bg} ${statusColor.text}`}>
                            {simulation.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#e0e0e0]">{simulation.attack_speed.toFixed(1)}x</td>
                        <td className="py-3 px-4 text-[#888899]">{formatRelativeTime(simulation.created_at)}</td>
                        <td className="py-3 px-4 text-[#888899]">{formatRelativeTime(simulation.started_at)}</td>
                        <td className="py-3 px-4 text-[#888899]">{formatRelativeTime(simulation.completed_at)}</td>
                        <td className="py-3 px-4">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleView(simulation)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#00d9ff] text-[#0a0a0f] text-xs font-semibold rounded hover:bg-cyan-400 transition-colors"
                          >
                            <Eye size={14} weight="bold" />
                            View
                          </motion.button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-[#262630] px-6 py-4 flex items-center justify-between bg-[#0a0a0f]">
                <div className="text-sm text-[#888899]">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-[#131318] text-[#e0e0e0] text-xs rounded hover:bg-[#1a1a20] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-[#131318] text-[#e0e0e0] text-xs rounded hover:bg-[#1a1a20] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
