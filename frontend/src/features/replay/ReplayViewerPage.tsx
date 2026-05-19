import { useParams, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import TopologyDiagram from '../../components/Topology/TopologyDiagram'
import { EventTimeline } from '../../components/EventTimeline'
import { AlertFeed } from '../../components/AlertFeed'
import { ReplayControls } from '../../components/ReplayControls'
import { TimelineScrubber } from '../../components/TimelineScrubber'
import { StatusLegend } from '../../components/StatusLegend'
import { useReplayPlayback } from '../../hooks/useReplayPlayback'
import { useSimulationWebSocket } from '../../hooks/useSimulationWebSocket'
import { useSimulationStore } from '../../store/simulationStore'
import { useAuthStore } from '../../store/authStore'
import { apiClient, replayClient } from '../../api/client'
import type { Replay } from '../../types/simulation'

export function ReplayViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const [currentEventSequence, setCurrentEventSequence] = useState<number>()
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())
  const [isAcknowledging, setIsAcknowledging] = useState<Record<string, boolean>>({})

  const storeTopology = useSimulationStore((s) => s.topology)
  const storeNodeStates = useSimulationStore((s) => s.nodeStates)
  const storeEvents = useSimulationStore((s) => s.events)
  const storeAlerts = useSimulationStore((s) => s.alerts)
  const storeAnimatingEdges = useSimulationStore((s) => s.animatingEdges)

  // Fetch replay metadata
  const { data: replay, isLoading: isLoadingReplay, error: replayError } = useQuery<Replay>({
    queryKey: ['replay', id],
    queryFn: async () => {
      const response = await replayClient.get(`/api/replays/${id}`)
      return response.data
    },
    enabled: !!id,
  })

  // Playback control hook
  const {
    play,
    pause,
    stop,
    seek,
    setSpeed,
    playbackState,
  } = useReplayPlayback(id || '', !!id)

  // Connect WebSocket using simulation_id from the replay
  const { connected, error: wsError } = useSimulationWebSocket(
    replay?.simulation_id || '',
    accessToken || '',
    !!replay?.simulation_id && !!accessToken
  )

  // Derived state
  const topology = storeTopology
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
      (acc: Record<string, string>, node: any) => {
        acc[node.id] = node.label
        return acc
      },
      {} as Record<string, string>
    )
  }, [topology])

  const currentPosition = playbackState ? playbackState.sequence / playbackState.total_events : 0
  const currentSpeed = playbackState?.speed || 1.0

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

  if (replayError) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Replay Not Found</h1>
          <p className="text-[#888899] mb-6">{replayError instanceof Error ? replayError.message : 'Unknown error'}</p>
          <button
            onClick={() => navigate('/replays')}
            className="px-4 py-2 rounded bg-[#262630] text-[#e0e0e0] hover:bg-[#2a2a30]"
          >
            Back to Replays
          </button>
        </div>
      </div>
    )
  }

  if (isLoadingReplay || !replay) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#262630] border-t-[#00d9ff] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#888899]">Loading replay...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#262630] bg-[#0a0a0f]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-[#e0e0e0]">{replay.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm text-[#888899]">ID: {replay.id.slice(0, 8)}...</p>
              <p className="text-sm text-[#888899]">Events: {replay.total_events}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-[#666677]">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {wsError && <span className="text-xs text-red-400">WS Error</span>}
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

      {/* Controls & Scrubber */}
      <div className="bg-[#0a0a0f] border-t border-[#262630] space-y-2 px-6 py-3">
        {/* Scrubber */}
        <TimelineScrubber
          currentPosition={currentPosition}
          totalEvents={replay.total_events}
          totalDurationMs={replay.duration_ms}
          onSeek={seek}
          disabled={!playbackState}
        />

        {/* Control Bar */}
        <ReplayControls
          status={playbackState?.status || 'STOPPED'}
          currentSpeed={currentSpeed}
          onPlay={play}
          onPause={pause}
          onStop={stop}
          onSpeedChange={setSpeed}
        />
      </div>
    </div>
  )
}
