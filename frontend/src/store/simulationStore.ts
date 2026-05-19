import { create } from 'zustand'
import type { SimulationTopology, SimulationEvent, Alert, SimulationNode } from '../types/simulation'

interface AnimatingEdge {
  sourceId: string
  targetId: string
  severity: string
  startTime: number
}

interface SimulationStoreState {
  topology: SimulationTopology | null
  nodeStates: Record<string, string>
  events: SimulationEvent[]
  alerts: Alert[]
  status: string
  currentAttackSpeed: number
  animatingEdges: Record<string, AnimatingEdge>
  connectedAt: number | null
}

interface SimulationStoreActions {
  syncTopology: (topology: SimulationTopology) => void
  updateNodeState: (nodeId: string, newStatus: string) => void
  addEvent: (event: SimulationEvent) => void
  addAlert: (alert: Alert) => void
  updateStatus: (status: string) => void
  setAttackSpeed: (speed: number) => void
  startEdgeAnimation: (sourceId: string, targetId: string, severity: string) => void
  clearAnimatingEdge: (edgeId: string) => void
  reset: () => void
}

const initialState: SimulationStoreState = {
  topology: null,
  nodeStates: {},
  events: [],
  alerts: [],
  status: 'INITIALIZING',
  currentAttackSpeed: 1.0,
  animatingEdges: {},
  connectedAt: null,
}

export const useSimulationStore = create<SimulationStoreState & SimulationStoreActions>((set) => ({
  ...initialState,

  syncTopology: (topology: SimulationTopology) => {
    set((state) => {
      const nodeStates: Record<string, string> = {}
      topology.nodes.forEach((node: SimulationNode) => {
        nodeStates[node.id] = node.status || state.nodeStates[node.id] || 'CLEAN'
      })
      return { topology, nodeStates, connectedAt: Date.now() }
    })
  },

  updateNodeState: (nodeId: string, newStatus: string) => {
    set((state) => ({
      nodeStates: { ...state.nodeStates, [nodeId]: newStatus },
    }))
  },

  addEvent: (event: SimulationEvent) => {
    set((state) => ({
      events: [event, ...state.events],
    }))
  },

  addAlert: (alert: Alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts],
    }))
  },

  updateStatus: (status: string) => {
    set({ status })
  },

  setAttackSpeed: (speed: number) => {
    set({ currentAttackSpeed: speed })
  },

  startEdgeAnimation: (sourceId: string, targetId: string, severity: string) => {
    const edgeId = `${sourceId}-${targetId}`
    set((state) => ({
      animatingEdges: {
        ...state.animatingEdges,
        [edgeId]: {
          sourceId,
          targetId,
          severity,
          startTime: Date.now(),
        },
      },
    }))
  },

  clearAnimatingEdge: (edgeId: string) => {
    set((state) => {
      const { [edgeId]: _, ...rest } = state.animatingEdges
      return { animatingEdges: rest }
    })
  },

  reset: () => {
    set(initialState)
  },
}))
