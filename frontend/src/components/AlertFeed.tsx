import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'phosphor-react'
import type { Alert } from '../types/simulation'

interface AlertFeedProps {
  alerts: Alert[]
  onAcknowledge?: (alertId: string) => void | Promise<void>
  nodeLabels?: Record<string, string>
  isAcknowledging?: Record<string, boolean>
}

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: '#3b82f6', bgColor: 'bg-blue-500/20' },
  MEDIUM: { label: 'Medium', color: '#eab308', bgColor: 'bg-yellow-500/20' },
  HIGH: { label: 'High', color: '#f97316', bgColor: 'bg-orange-500/20' },
  CRITICAL: { label: 'Critical', color: '#ef4444', bgColor: 'bg-red-500/20' },
}

export function AlertFeed({ alerts, onAcknowledge, nodeLabels = {}, isAcknowledging = {} }: AlertFeedProps) {
  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [alerts])

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const unacknowledgedCount = sortedAlerts.filter((a) => !a.acknowledged).length

  return (
    <div className="flex flex-col h-full">
      {unacknowledgedCount > 0 && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs font-medium">
          {unacknowledgedCount} unacknowledged alert{unacknowledgedCount !== 1 ? 's' : ''}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#262630] scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {sortedAlerts.map((alert, index) => {
            const severityStyle = severityConfig[alert.severity] || severityConfig.MEDIUM
            const affectedNodeLabel = nodeLabels[alert.affected_node_id] || alert.affected_node_id
            const isLoading = isAcknowledging[alert.id]

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className={`px-4 py-3 border-b border-[#262630] transition-colors ${
                  alert.acknowledged ? 'opacity-60' : ''
                } ${!alert.acknowledged ? 'hover:bg-[#1a1a1f]' : ''}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#e0e0e0]">{alert.title}</p>
                    </div>
                    <span
                      className={`${severityStyle.bgColor} text-xs font-semibold px-2 py-1 rounded whitespace-nowrap flex-shrink-0`}
                      style={{ color: severityStyle.color }}
                    >
                      {severityStyle.label}
                    </span>
                  </div>

                  <div className="text-xs text-[#888899]">
                    Affected: <span className="text-[#a0a0b0]">{affectedNodeLabel}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#666677]">{formatTime(alert.created_at)}</span>

                    {!alert.acknowledged && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onAcknowledge?.(alert.id)}
                        disabled={isLoading}
                        className="text-xs font-medium px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-1 transition-colors"
                      >
                        <Check size={12} weight="bold" />
                        {isLoading ? 'Acknowledging...' : 'Acknowledge'}
                      </motion.button>
                    )}

                    {alert.acknowledged && (
                      <div className="text-xs text-green-400 flex items-center gap-1">
                        <Check size={12} weight="bold" />
                        Acknowledged
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {sortedAlerts.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#666677]">
            <p className="text-sm">No alerts</p>
          </div>
        )}
      </div>
    </div>
  )
}
