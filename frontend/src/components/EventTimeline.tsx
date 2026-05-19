import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SimulationEvent } from '../types/simulation'

interface EventTimelineProps {
  events: SimulationEvent[]
  currentSequence?: number
  onEventClick?: (eventId: string) => void
  nodeLabels?: Record<string, string>
}

const eventTypeConfig: Record<string, { label: string; color: string }> = {
  RECON: { label: 'Recon', color: 'bg-blue-600' },
  INITIAL_ACCESS: { label: 'Initial Access', color: 'bg-orange-600' },
  EXECUTION: { label: 'Execution', color: 'bg-red-600' },
  LATERAL_MOVEMENT: { label: 'Lateral Movement', color: 'bg-purple-600' },
  PERSISTENCE: { label: 'Persistence', color: 'bg-red-500' },
  PRIVILEGE_ESCALATION: { label: 'Privilege Escalation', color: 'bg-red-700' },
  CREDENTIAL_ACCESS: { label: 'Credential Access', color: 'bg-yellow-600' },
  COLLECTION: { label: 'Collection', color: 'bg-pink-600' },
  EXFILTRATION: { label: 'Exfiltration', color: 'bg-red-500' },
}

const severityConfig: Record<string, { color: string; bgColor: string }> = {
  LOW: { color: '#3b82f6', bgColor: 'bg-blue-500/20' },
  MEDIUM: { color: '#eab308', bgColor: 'bg-yellow-500/20' },
  HIGH: { color: '#f97316', bgColor: 'bg-orange-500/20' },
  CRITICAL: { color: '#ef4444', bgColor: 'bg-red-500/20' },
}

export function EventTimeline({ events, currentSequence, onEventClick, nodeLabels = {} }: EventTimelineProps) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => b.sequence_number - a.sequence_number)
  }, [events])

  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#262630] scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {sortedEvents.map((event, index) => {
            const eventConfig = eventTypeConfig[event.event_type] || { label: event.event_type, color: 'bg-gray-600' }
            const severityStyle = severityConfig[event.severity] || severityConfig.MEDIUM
            const sourceLabel = nodeLabels[event.source_node_id] || event.source_node_id
            const targetLabel = nodeLabels[event.target_node_id] || event.target_node_id
            const isCurrent = event.sequence_number === currentSequence

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onEventClick?.(event.id)}
                className={`px-4 py-3 border-b border-[#262630] cursor-pointer transition-colors ${
                  isCurrent ? 'bg-[#1a1a1f]' : 'hover:bg-[#1a1a1f]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`${eventConfig.color} text-white text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap`}>
                        {eventConfig.label}
                      </span>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: severityStyle.color }} />
                    </div>

                    <div className="text-sm font-medium text-[#e0e0e0] mb-1 truncate">
                      {sourceLabel} → {targetLabel}
                    </div>

                    {event.payload?.description ? (
                      <div className="text-xs text-[#888899] line-clamp-2">
                        {String(event.payload.description)}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-[#666677] whitespace-nowrap flex-shrink-0">
                    {formatTime(event.fired_at)}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {sortedEvents.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#666677]">
            <p className="text-sm">No events yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
