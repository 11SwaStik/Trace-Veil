import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'phosphor-react'
import { useAlerts } from './useAlerts'
import { useDetectionRules } from './useDetectionRules'
import { apiClient } from '../../api/client'

const severityColors: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  HIGH: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-400' },
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

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AlertsPage() {
  const [simulationFilter, setSimulationFilter] = useState<string>('')
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<boolean | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [acknowledging, setAcknowledging] = useState<Set<string>>(new Set())
  const itemsPerPage = 20

  const { data: alerts, isLoading: isLoadingAlerts, error: alertsError } = useAlerts(
    simulationFilter || undefined,
    acknowledgedFilter,
    itemsPerPage,
    (currentPage - 1) * itemsPerPage
  )

  const { data: detectionRules, isLoading: isLoadingRules } = useDetectionRules()

  const severityCounts = useMemo(() => {
    if (!alerts) return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    return {
      CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL').length,
      HIGH: alerts.filter((a) => a.severity === 'HIGH').length,
      MEDIUM: alerts.filter((a) => a.severity === 'MEDIUM').length,
      LOW: alerts.filter((a) => a.severity === 'LOW').length,
    }
  }, [alerts])

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging((prev) => new Set([...prev, alertId]))
    try {
      await apiClient.post(`/api/alerts/${alertId}/acknowledge`)
      // Refetch will happen automatically due to refetchInterval
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setAcknowledging((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#e0e0e0] mb-2">Alerts</h1>
        <p className="text-[#888899]">Monitor and manage detection alerts from your simulations</p>
      </div>

      {/* Severity Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4 hover:border-red-500/30 transition-colors">
          <p className="text-[#888899] text-sm mb-1">Critical</p>
          <p className="text-2xl font-bold text-[#ef4444]">{severityCounts.CRITICAL}</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4 hover:border-orange-500/30 transition-colors">
          <p className="text-[#888899] text-sm mb-1">High</p>
          <p className="text-2xl font-bold text-[#f97316]">{severityCounts.HIGH}</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4 hover:border-yellow-500/30 transition-colors">
          <p className="text-[#888899] text-sm mb-1">Medium</p>
          <p className="text-2xl font-bold text-[#eab308]">{severityCounts.MEDIUM}</p>
        </div>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-4 hover:border-blue-500/30 transition-colors">
          <p className="text-[#888899] text-sm mb-1">Low</p>
          <p className="text-2xl font-bold text-[#3b82f6]">{severityCounts.LOW}</p>
        </div>
      </div>

      {/* Detection Rules */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-[#e0e0e0]">
          Detection Rules {detectionRules && `(${detectionRules.length})`}
        </h2>
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
          {isLoadingRules ? (
            <p className="text-[#888899]">Loading detection rules...</p>
          ) : !detectionRules || detectionRules.length === 0 ? (
            <p className="text-[#888899]">No detection rules found</p>
          ) : (
            <div className="space-y-3">
              {detectionRules.map((rule) => (
                <div key={rule.id} className="flex items-start justify-between p-3 bg-[#0a0a0f] rounded border border-[#262630]">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#e0e0e0]">{rule.name}</p>
                    <div className="flex gap-3 mt-2 text-xs text-[#888899]">
                      <span>Event: {rule.event_type_filter}</span>
                      <span>Min severity: {rule.severity_min}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      disabled
                      className="w-4 h-4 cursor-not-allowed"
                    />
                    <span className="text-xs text-[#666677]">{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alert History */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-[#e0e0e0]">Alert History</h2>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#888899]">Filter:</label>
            <input
              type="text"
              placeholder="Simulation ID"
              value={simulationFilter}
              onChange={(e) => {
                setSimulationFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-[#131318] border border-[#262630] rounded px-3 py-2 text-[#e0e0e0] text-sm placeholder-[#666677] hover:border-[#00d9ff] transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#888899]">
              <input
                type="checkbox"
                checked={acknowledgedFilter === false}
                onChange={() => setAcknowledgedFilter(acknowledgedFilter === false ? undefined : false)}
                className="mr-2"
              />
              Unacknowledged only
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden">
          {alertsError ? (
            <div className="p-6 text-center text-red-400">Failed to load alerts</div>
          ) : isLoadingAlerts ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[#888899]">Loading alerts...</p>
            </div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[#888899]">No alerts found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#262630] bg-[#0a0a0f]">
                    <tr>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Timestamp</th>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Severity</th>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Title</th>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Node</th>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Simulation</th>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-[#e0e0e0] font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, idx) => {
                      const bgColor = idx % 2 === 0 ? 'bg-[#131318]' : 'bg-[#0a0a0f]'
                      const severityColor = severityColors[alert.severity] || severityColors.LOW
                      const isAcknowledging = acknowledging.has(alert.id)

                      return (
                        <motion.tr
                          key={alert.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`${bgColor} border-b border-[#262630] hover:bg-[#1a1a20] transition-colors`}
                        >
                          <td className="py-3 px-4 text-[#888899] text-xs">{formatRelativeTime(alert.created_at)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${severityColor.bg} ${severityColor.text}`}>
                              {alert.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#e0e0e0]">{alert.title}</td>
                          <td className="py-3 px-4 text-[#888899]">{alert.affected_node_id.slice(0, 8)}</td>
                          <td className="py-3 px-4 text-[#888899]">{alert.simulation_id.slice(0, 8)}</td>
                          <td className="py-3 px-4">
                            {alert.acknowledged ? (
                              <div className="flex items-center gap-1 text-green-400">
                                <Check size={14} weight="bold" />
                                <span className="text-xs">Acknowledged</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-400">
                                <X size={14} weight="bold" />
                                <span className="text-xs">Pending</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {!alert.acknowledged && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={isAcknowledging}
                                className="px-3 py-1.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded hover:bg-green-500/30 disabled:opacity-50 transition-colors"
                              >
                                {isAcknowledging ? 'Ack...' : 'Acknowledge'}
                              </motion.button>
                            )}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-[#262630] px-6 py-4 flex items-center justify-between bg-[#0a0a0f]">
                <div className="text-sm text-[#888899]">Page {currentPage}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-[#131318] text-[#e0e0e0] text-xs rounded hover:bg-[#1a1a20] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!alerts || alerts.length < itemsPerPage}
                    className="px-3 py-1.5 bg-[#131318] text-[#e0e0e0] text-xs rounded hover:bg-[#1a1a20] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
