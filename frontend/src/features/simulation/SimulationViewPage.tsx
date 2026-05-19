import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TopologyDiagram } from '../../components/Topology/TopologyDiagram'
import { EventTimeline } from '../../components/EventTimeline'
import { AlertFeed } from '../../components/AlertFeed'
import { SimulationControls } from '../../components/SimulationControls'
import { StatusLegend } from '../../components/StatusLegend'
import { useSimulationWebSocket } from '../../hooks/useSimulationWebSocket'
import { useSimulationControls } from './useSimulationControls'
import { useSimulationStore } from '../../store/simulationStore'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../api/client'
import type { Simulation, SimulationStatus } from '../../types/simulation'

export function SimulationViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const [currentEventSequence, setCurrentEventSequence] = useState<number>()
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())
  const [isAcknowledging, setIsAcknowledging] = useState<Record<string, boolean>>({})
  const [elapsedTime, setElapsedTime] = useState(0)

  const storeTopology = useSimulationStore((s) => s.topology)
  const storeNodeStates = useSimulationStore((s) => s.nodeStates)
  const storeEvents = useSimulationStore((s) => s.events)
  const storeAlerts = useSimulationStore((s) => s.alerts)
  const storeAnimatingEdges = useSimulationStore((s) => s.animatingEdges)
  const currentAttackSpeed = useSimulationStore((s) => s.currentAttackSpeed)
  const storeSimulationStatus = useSimulationStore((s) => s.status)
  const syncTopology = useSimulationStore((s) => s.syncTopology)

  const { data: simulation, isLoading: isLoadingSimulation, error: simulationError } = useQuery<Simulation>({
    queryKey: ['simulation', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/simulations/${id}`)
      return response.data
    },
    enabled: !!id,
    refetchInterval: 5000,
  })

  const { connected, error: wsError, reconnectAttempts } = useSimulationWebSocket(id || '', accessToken || '', !!id && !!accessToken)

  const { pause, resume, stop } = useSimulationControls(id || '')

  // Sync topology from API on load
  useEffect(() => {
    if (simulation?.topology && !storeTopology) {
      syncTopology(simulation.topology)
    }
  }, [simulation?.topology, storeTopology, syncTopology])

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulation?.started_at) {
        const startTime = new Date(simulation.started_at).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [simulation?.started_at])

  const topology = storeTopology || simulation?.topology
  const animatingEdgesData = useMemo(() => {
    return Object.values(storeAnimatingEdges).reduce(
      (acc, edge) => {
        const edgeId = `${edge.sourceId}-${edge.targetId}`
        acc[edgeId] = { sourceId: edge.sourceId, targetId: edge.targetId, severity: edge.severity }
        return acc
      },
      {} as Record<string, { sourceId: string; targetId: string; severity: string }>
    )
  }, [storeAnimatingEdges])

  const nodeLabels = useMemo(() => {
    if (!topology) return {}
    return topology.nodes.reduce(
      (acc, node) => {
        acc[node.id] = node.label
        return acc
      },
      {} as Record<string, string>
    )
  }, [topology])

  const handleEventClick = (eventId: string) => {
    const event = storeEvents.find((e) => e.id === eventId)
    if (event) {
      setCurrentEventSequence(event.sequence_number)
    }
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    setIsAcknowledging((prev) => ({ ...prev, [alertId]: true }))
    try {
      await apiClient.post(`/api/alerts/${alertId}/acknowledge`)
      setAcknowledgedAlerts((prev) => new Set([...prev, alertId]))
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    } finally {
      setIsAcknowledging((prev) => ({ ...prev, [alertId]: false }))
    }
  }

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  if (simulationError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Simulation Not Found</h1>
          <p className="text-[#888899] mb-6">{simulationError instanceof Error ? simulationError.message : 'Unknown error'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded bg-[#262630] text-[#e0e0e0] hover:bg-[#2a2a30]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (isLoadingSimulation || !topology) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#262630] border-t-[#00d9ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#888899]">Loading simulation...</p>
        </div>
      </div>
    )
  }

  const simulationStatus = (storeSimulationStatus || simulation?.status) as SimulationStatus

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#262630] bg-[#0a0a0f]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-[#e0e0e0]">{simulation?.scenario_id || 'Simulation'}</h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-[#888899]">ID: {id}</p>
              <p className="text-sm text-[#888899]">Elapsed: {formatElapsedTime(elapsedTime)}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-[#666677]">
                  {connected ? 'Connected' : `Reconnecting... (${reconnectAttempts})`}
                </span>
              </div>
              {wsError && <span className="text-xs text-red-400">WS Error: {wsError.message}</span>}
            </div>
          </div>
          <StatusLegend />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left: Topology (60%) */}
        <div className="col-span-2 bg-[#131318] border border-[#262630] rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#262630]">
            <h2 className="text-lg font-semibold text-[#e0e0e0]">Network Topology</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            {topology && (
              <TopologyDiagram
                topology={topology}
                nodeStates={storeNodeStates}
                animatingEdges={animatingEdgesData}
              />
            )}
          </div>
        </div>

        {/* Right: Alerts & Events (40%) */}
        <div className="col-span-1 flex flex-col gap-4">
          {/* Alerts */}
          <div className="flex-1 bg-[#131318] border border-[#262630] rounded-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#262630]">
              <h2 className="text-lg font-semibold text-[#e0e0e0]">Alerts</h2>
            </div>
            <AlertFeed
              alerts={storeAlerts.map((alert) => ({
                ...alert,
                acknowledged: acknowledgedAlerts.has(alert.id) || alert.acknowledged,
              }))}
              onAcknowledge={handleAcknowledgeAlert}
              nodeLabels={nodeLabels}
              isAcknowledging={isAcknowledging}
            />
          </div>

          {/* Events */}
          <div className="flex-1 bg-[#131318] border border-[#262630] rounded-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#262630]">
              <h2 className="text-lg font-semibold text-[#e0e0e0]">Event Timeline</h2>
            </div>
            <EventTimeline
              events={storeEvents}
              currentSequence={currentEventSequence}
              onEventClick={handleEventClick}
              nodeLabels={nodeLabels}
            />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <SimulationControls
        status={simulationStatus}
        attackSpeed={currentAttackSpeed}
        onPause={pause}
        onResume={resume}
        onStop={stop}
      />
    </div>
  )
}
