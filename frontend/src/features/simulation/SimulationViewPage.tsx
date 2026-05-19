import { useParams } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { TopologyDiagram } from '../../components/Topology/TopologyDiagram'
import { EventTimeline } from '../../components/EventTimeline'
import { AlertFeed } from '../../components/AlertFeed'
import { SimulationControls } from '../../components/SimulationControls'
import { StatusLegend } from '../../components/StatusLegend'
import { mockTopology } from '../../fixtures/mockTopology'
import { mockEvents, mockAlerts } from '../../fixtures/mockEvents'
import type { SimulationTopology, SimulationStatus } from '../../types/simulation'

export function SimulationViewPage() {
  const { id } = useParams<{ id: string }>()
  const [topology] = useState<SimulationTopology>(mockTopology)
  const [nodeStates] = useState<Record<string, string>>({})
  const [animatingEdges] = useState<Record<string, { sourceId: string; targetId: string; severity: string }>>({})
  const [currentEventSequence, setCurrentEventSequence] = useState<number>()
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set())
  const [isAcknowledging, setIsAcknowledging] = useState<Record<string, boolean>>({})
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus>('RUNNING')
  const [attackSpeed] = useState(1.0)

  const nodeLabels = useMemo(() => {
    return topology.nodes.reduce(
      (acc, node) => {
        acc[node.id] = node.label
        return acc
      },
      {} as Record<string, string>
    )
  }, [topology])

  const alertsWithAcknowledgment = useMemo(() => {
    return mockAlerts.map((alert) => ({
      ...alert,
      acknowledged: acknowledgedAlerts.has(alert.id) || alert.acknowledged,
    }))
  }, [acknowledgedAlerts])

  const handleEventClick = (eventId: string) => {
    const event = mockEvents.find((e) => e.id === eventId)
    if (event) {
      setCurrentEventSequence(event.sequence_number)
    }
  }

  const handleAcknowledgeAlert = async (alertId: string) => {
    setIsAcknowledging((prev) => ({ ...prev, [alertId]: true }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setAcknowledgedAlerts((prev) => new Set([...prev, alertId]))
    } finally {
      setIsAcknowledging((prev) => ({ ...prev, [alertId]: false }))
    }
  }

  const handlePause = () => {
    setSimulationStatus('PAUSED')
    console.log('Simulation paused')
  }

  const handleResume = () => {
    setSimulationStatus('RUNNING')
    console.log('Simulation resumed')
  }

  const handleStop = () => {
    setSimulationStatus('STOPPED')
    console.log('Simulation stopped')
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="px-6 py-4 border-b border-[#262630] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e0e0e0]">Simulation: {id}</h1>
          <p className="text-sm text-[#888899]">Live simulation view</p>
        </div>
        <StatusLegend />
      </div>

      <div className="flex-1 grid grid-cols-4 gap-4 p-4 overflow-hidden">
        <div className="col-span-2 bg-[#131318] border border-[#262630] rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#262630]">
            <h2 className="text-lg font-semibold text-[#e0e0e0]">Network Topology</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <TopologyDiagram topology={topology} nodeStates={nodeStates} animatingEdges={animatingEdges} />
          </div>
        </div>

        <div className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#262630]">
            <h2 className="text-lg font-semibold text-[#e0e0e0]">Event Timeline</h2>
          </div>
          <EventTimeline
            events={mockEvents}
            currentSequence={currentEventSequence}
            onEventClick={handleEventClick}
            nodeLabels={nodeLabels}
          />
        </div>

        <div className="bg-[#131318] border border-[#262630] rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[#262630]">
            <h2 className="text-lg font-semibold text-[#e0e0e0]">Alert Feed</h2>
          </div>
          <AlertFeed
            alerts={alertsWithAcknowledgment}
            onAcknowledge={handleAcknowledgeAlert}
            nodeLabels={nodeLabels}
            isAcknowledging={isAcknowledging}
          />
        </div>
      </div>

      <SimulationControls
        status={simulationStatus}
        attackSpeed={attackSpeed}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
      />
    </div>
  )
}
